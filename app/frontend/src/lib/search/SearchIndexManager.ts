/**
 * SearchIndexManager - Client-side encrypted search index using IndexedDB + Trie algorithm
 *
 * Manages building and querying a full-text search index for encrypted ideas and infobase entries.
 * Index rebuilds automatically on vault unlock and remains in IndexedDB for offline search.
 *
 * Architecture:
 * - IndexedDB Database: passion_search_v1
 * - Stores: content, tokens, trie_index, metadata
 * - Triggers: Vault unlock → rebuildIndex()
 * - Search: Client-side trie lookup (no server call needed)
 */

export interface SearchableContent {
  id: string;
  contentType: 'idea' | 'infobase';
  encryptedText: string;
  plaintextHash: string;
  tags: string[];
  status: 'active' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface TrieNode {
  prefix: string;
  nodeType: 'prefix' | 'word';
  children: string[];
  contentIds: string[];
  frequency: number;
}

export interface IndexToken {
  contentId: string;
  wordToken: string;
  tokenType: 'word' | 'phrase' | 'tag' | 'chord';
  positions: number[];
  frequency: number;
}

export interface SearchResult {
  id: string;
  contentType: 'idea' | 'infobase';
  title: string;
  preview: string;
  highlights: HighlightSpan[];
  relevanceScore: number;
  createdAt: Date;
  tags: string[];
}

export interface HighlightSpan {
  position: number;
  length: number;
  text: string;
}

export interface SearchOptions {
  type?: 'idea' | 'infobase' | 'all';
  limit?: number;
  offset?: number;
}

export interface SearchIndexMetadata {
  lastIndexed: number | null;
  itemsIndexed: number;
  status: 'ready' | 'building' | 'error' | 'empty';
}

// Stop words for tokenization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'so', 'some',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

/**
 * Tokenizer class for converting text to searchable tokens
 */
class Tokenizer {
  private static CHORD_PATTERN = /([A-G](?:[b#])?(?:maj|min|dim|aug|sus|add)?(?:\d+)?)/gi;
  private static SPECIAL_CHAR_PATTERN = /[^\w\s-]/g;

  static tokenize(text: string): {
    words: string[];
    phrases: string[];
    chords: string[];
    positions: Map<string, number[]>;
  } {
    const words: string[] = [];
    const phrases: string[] = [];
    const chords: string[] = [];
    const positions = new Map<string, number[]>();

    const lower = text.toLowerCase();

    // Extract chords (preserve case sensitivity)
    const chordMatches = text.matchAll(this.CHORD_PATTERN);
    for (const match of chordMatches) {
      if (match[0] && match.index !== undefined) {
        chords.push(match[0]);
        if (!positions.has(match[0].toLowerCase())) {
          positions.set(match[0].toLowerCase(), []);
        }
        positions.get(match[0].toLowerCase())!.push(match.index);
      }
    }

    // Split by whitespace and punctuation
    const tokens = lower
      .replace(this.SPECIAL_CHAR_PATTERN, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);

    // Filter stop words and collect words
    for (const token of tokens) {
      if (!STOP_WORDS.has(token) && token.length > 1) {
        if (!positions.has(token)) {
          positions.set(token, []);
        }
        // Find position in original text
        const idx = lower.indexOf(token);
        if (idx >= 0) {
          positions.get(token)!.push(idx);
        }
        words.push(token);
      }
    }

    // Extract 2-3 word phrases from remaining words
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = `${words[i]} ${words[i + 1]}`;
      phrases.push(phrase2);

      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.push(phrase3);
      }
    }

    return { words, phrases, chords, positions };
  }
}

/**
 * Trie data structure for efficient prefix searching
 */
class Trie {
  private nodes: Map<string, TrieNode> = new Map();

  insert(word: string, contentId: string): void {
    let prefix = '';
    const prefixes: string[] = [];

    // Build all prefixes
    for (const ch of word) {
      prefix += ch;
      prefixes.push(prefix);

      if (!this.nodes.has(prefix)) {
        this.nodes.set(prefix, {
          prefix,
          nodeType: 'prefix',
          children: [],
          contentIds: [],
          frequency: 0,
        });
      }

      const node = this.nodes.get(prefix)!;
      if (!node.contentIds.includes(contentId)) {
        node.contentIds.push(contentId);
      }
      node.frequency += 1;
    }

    // Mark final node as word
    if (this.nodes.has(prefix)) {
      this.nodes.get(prefix)!.nodeType = 'word';
    }

    // Update children pointers
    for (let i = 0; i < prefixes.length - 1; i++) {
      const current = this.nodes.get(prefixes[i])!;
      const next = prefixes[i + 1];
      if (!current.children.includes(next)) {
        current.children.push(next);
      }
    }
  }

  getByPrefix(prefix: string): string[] {
    const node = this.nodes.get(prefix);
    return node ? node.contentIds : [];
  }

  getNode(prefix: string): TrieNode | undefined {
    return this.nodes.get(prefix);
  }

  removeContent(contentId: string): void {
    for (const node of this.nodes.values()) {
      const index = node.contentIds.indexOf(contentId);
      if (index >= 0) {
        node.contentIds.splice(index, 1);
      }
    }
  }

  getAllNodes(): TrieNode[] {
    return Array.from(this.nodes.values());
  }

  clear(): void {
    this.nodes.clear();
  }
}

/**
 * SearchIndexManager - Main class for managing search index
 */
export class SearchIndexManager {
  private static readonly DB_NAME = 'passion_search_v1';
  private static readonly DB_VERSION = 1;

  private db: IDBDatabase | null = null;
  private trie: Trie | null = null;
  private isBuilding = false;
  private listeners: Set<(event: IndexRebuildEvent) => void> = new Set();

  /**
   * Initialize IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SearchIndexManager.DB_NAME, SearchIndexManager.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create content store
        if (!db.objectStoreNames.contains('content')) {
          db.createObjectStore('content', { keyPath: 'contentId' }).createIndex(
            'contentType',
            'contentType',
          );
        }

        // Create tokens store
        if (!db.objectStoreNames.contains('tokens')) {
          const tokenStore = db.createObjectStore('tokens', { keyPath: ['contentId', 'wordToken'] });
          tokenStore.createIndex('wordToken', 'wordToken');
        }

        // Create trie_index store
        if (!db.objectStoreNames.contains('trie_index')) {
          db.createObjectStore('trie_index', { keyPath: 'prefix' });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Rebuild search index from encrypted content
   * Called when vault unlocks
   */
  async rebuildIndex(contentList: SearchableContent[]): Promise<void> {
    if (this.isBuilding) {
      console.warn('Index rebuild already in progress');
      return;
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    this.isBuilding = true;
    this.emit('rebuild-started', { itemsTotal: contentList.length });

    try {
      // Clear existing index
      await this.clearIndex();

      this.trie = new Trie();
      let itemsProcessed = 0;

      // Process content in batches
      const batchSize = 100;
      for (let i = 0; i < contentList.length; i += batchSize) {
        const batch = contentList.slice(i, Math.min(i + batchSize, contentList.length));

        const tx = this.db.transaction(
          ['content', 'tokens', 'trie_index'],
          'readwrite',
        );

        for (const content of batch) {
          // Store content
          tx.objectStore('content').put(content);

          // Tokenize content
          const tokenizationResult = Tokenizer.tokenize(content.encryptedText);

          // Store tokens
          for (const word of tokenizationResult.words) {
            tx.objectStore('tokens').put({
              contentId: content.id,
              wordToken: word,
              tokenType: 'word',
              positions: tokenizationResult.positions.get(word) || [],
              frequency: 1,
            });

            // Build trie
            this.trie!.insert(word, content.id);
          }

          for (const phrase of tokenizationResult.phrases) {
            tx.objectStore('tokens').put({
              contentId: content.id,
              wordToken: phrase,
              tokenType: 'phrase',
              positions: [],
              frequency: 1,
            });

            // Insert phrase into trie for multi-word search
            this.trie!.insert(phrase.replace(/\s+/g, ''), content.id);
          }
        }

        await new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve(undefined);
          tx.onerror = () => reject(tx.error);
        });

        itemsProcessed += batch.length;
        this.emit('rebuild-progress', { itemsProcessed, itemsTotal: contentList.length });
      }

      // Store trie index
      if (this.trie) {
        const trieTx = this.db.transaction('trie_index', 'readwrite');
        for (const node of this.trie.getAllNodes()) {
          trieTx.objectStore('trie_index').put(node);
        }

        await new Promise((resolve, reject) => {
          trieTx.oncomplete = () => resolve(undefined);
          trieTx.onerror = () => reject(trieTx.error);
        });
      }

      // Update metadata
      await this.updateMetadata({
        lastIndexed: Date.now(),
        itemsIndexed: contentList.length,
        status: 'ready',
      });

      this.emit('rebuild-completed', { itemsIndexed: contentList.length });
    } catch (error) {
      console.error('Index rebuild failed:', error);
      await this.updateMetadata({
        lastIndexed: null,
        itemsIndexed: 0,
        status: 'error',
      });
      this.emit('rebuild-error', { error: error instanceof Error ? error : new Error(String(error)) });
    } finally {
      this.isBuilding = false;
    }
  }

  /**
   * Search the index
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    if (!query.trim()) {
      return [];
    }

    const _startTime = performance.now();
    const contentType = options.type;
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      const tx = this.db.transaction('trie_index', 'readonly');
      const triStore = tx.objectStore('trie_index');

      // Tokenize query
      const queryTokens = Tokenizer.tokenize(query).words;
      let resultIds = new Set<string>();

      if (queryTokens.length === 0) {
        return [];
      }

      // Search for first token in trie
      const firstToken = queryTokens[0];
      const matchedIds = await this.getContentIdsForToken(triStore, firstToken);

      if (matchedIds.length === 0) {
        return [];
      }

      resultIds = new Set(matchedIds);

      // Intersect with other tokens (AND logic)
      for (let i = 1; i < queryTokens.length; i++) {
        const token = queryTokens[i];
        const tokenIds = await this.getContentIdsForToken(triStore, token);
        resultIds = new Set([...resultIds].filter(id => tokenIds.includes(id)));

        if (resultIds.size === 0) {
          return [];
        }
      }

      // Fetch matching content and score
      const results: SearchResult[] = [];
      const contentTx = this.db.transaction('content', 'readonly');
      const contentStore = contentTx.objectStore('content');

      for (const contentId of resultIds) {
        const content = await new Promise<SearchableContent | undefined>(
          (resolve, reject) => {
            const req = contentStore.get(contentId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          },
        );

        if (!content) continue;

        // Filter by content type if specified
        if (contentType && contentType !== 'all' && content.contentType !== contentType) {
          continue;
        }

        // Skip deleted content
        if (content.status === 'deleted') {
          continue;
        }

        // Calculate relevance score
        const score = this.calculateRelevance(query, content);

        results.push({
          id: content.id,
          contentType: content.contentType,
          title: this.getTitleForContent(content),
          preview: this.truncatePreview(content.encryptedText, 150),
          highlights: [],
          relevanceScore: score,
          createdAt: content.createdAt,
          tags: content.tags,
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Apply pagination
      return results.slice(offset, offset + limit);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Add or update content in the index
   */
  async addContentToIndex(content: SearchableContent): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const tx = this.db.transaction(
      ['content', 'tokens', 'trie_index'],
      'readwrite',
    );

    // Store content
    tx.objectStore('content').put(content);

    // Tokenize and store
    const tokenizationResult = Tokenizer.tokenize(content.encryptedText);

    for (const word of tokenizationResult.words) {
      tx.objectStore('tokens').put({
        contentId: content.id,
        wordToken: word,
        tokenType: 'word',
        positions: tokenizationResult.positions.get(word) || [],
        frequency: 1,
      });

      // Update trie
      if (this.trie) {
        this.trie.insert(word, content.id);
      }
    }

    // Store updated trie nodes
    if (this.trie) {
      const triePrefix = tokenizationResult.words[0] || '';
      if (triePrefix) {
        for (const node of this.trie.getAllNodes()) {
          if (node.prefix.startsWith(triePrefix)) {
            tx.objectStore('trie_index').put(node);
          }
        }
      }
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Remove content from the index
   */
  async removeContentFromIndex(contentId: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const tx = this.db.transaction(
      ['content', 'tokens', 'trie_index'],
      'readwrite',
    );

    // Mark as deleted
    tx.objectStore('content').delete(contentId);

    // Remove tokens
    const tokenStore = tx.objectStore('tokens');
    const range = IDBKeyRange.bound([contentId], [contentId, '\uffff']);
    tokenStore.delete(range);

    // Update trie
    if (this.trie) {
      this.trie.removeContent(contentId);

      // Update trie index
      for (const node of this.trie.getAllNodes()) {
        if (node.contentIds.length === 0) {
          tx.objectStore('trie_index').delete(node.prefix);
        } else {
          tx.objectStore('trie_index').put(node);
        }
      }
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clear the entire index
   */
  async clearIndex(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const tx = this.db.transaction(
      ['content', 'tokens', 'trie_index', 'metadata'],
      'readwrite',
    );

    tx.objectStore('content').clear();
    tx.objectStore('tokens').clear();
    tx.objectStore('trie_index').clear();

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });

    this.trie = null;
  }

  /**
   * Get index status
   */
  async getStatus(): Promise<SearchIndexMetadata> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get('status');

      req.onsuccess = () => {
        const result = req.result || {
          lastIndexed: null,
          itemsIndexed: 0,
          status: 'empty',
        };
        resolve(result);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  }

  // ==================== Private Methods ====================

  private async getContentIdsForToken(store: IDBObjectStore, token: string): Promise<string[]> {
    // First try exact match
    const node = await new Promise<TrieNode | undefined>((resolve, reject) => {
      const req = store.get(token);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (node && node.contentIds.length > 0) {
      return node.contentIds;
    }

    // Try prefix search
    const prefixNodes: string[] = [];
    for (let i = 1; i <= token.length; i++) {
      const prefix = token.substring(0, i);
      const prefixNode = await new Promise<TrieNode | undefined>((resolve, reject) => {
        const req = store.get(prefix);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (prefixNode && prefixNode.contentIds.length > 0) {
        prefixNodes.push(...prefixNode.contentIds);
      }
    }

    return [...new Set(prefixNodes)];
  }

  private calculateRelevance(query: string, content: SearchableContent): number {
    const queryLower = query.toLowerCase();
    let score = 0.0;

    // Exact match in content ID
    if (content.id.toLowerCase().includes(queryLower)) {
      score += 5.0;
    }

    // Match in tags
    for (const tag of content.tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        score += 3.0;
      }
    }

    // Single-word queries are more specific
    if (!query.includes(' ')) {
      score += 1.0;
    }

    // Recency bonus
    const daysOld = (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2.0 - daysOld * 0.1);

    return score;
  }

  private getTitleForContent(content: SearchableContent): string {
    if (content.contentType === 'idea') {
      return `Idea (${new Date(content.createdAt).toLocaleDateString()})`;
    }

    if (content.tags.length > 0) {
      return `Note in ${content.tags[0]}`;
    }

    return 'Knowledge Base Entry';
  }

  private truncatePreview(text: string, maxLen: number): string {
    if (text.length > maxLen) {
      return `${text.substring(0, maxLen)}...`;
    }
    return text;
  }

  private async updateMetadata(metadata: SearchIndexMetadata): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');

      store.put({ key: 'status', ...metadata });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==================== Event System ====================

  on(event: string, callback: (data: IndexRebuildEvent) => void): void {
    this.listeners.add(callback);
  }

  off(event: string, callback: (data: IndexRebuildEvent) => void): void {
    this.listeners.delete(callback);
  }

  private emit(eventType: string, data: Omit<IndexRebuildEvent, 'type'>): void {
    for (const listener of this.listeners) {
      listener({ ...data, type: eventType });
    }
  }
}

export interface IndexRebuildEvent {
  type: string;
  itemsTotal?: number;
  itemsProcessed?: number;
  itemsIndexed?: number;
  error?: Error;
}

// Singleton instance
let searchManager: SearchIndexManager | null = null;

/**
 * Get or initialize the global search manager instance
 */
export async function getSearchManager(): Promise<SearchIndexManager> {
  if (!searchManager) {
    searchManager = new SearchIndexManager();
    await searchManager.initialize();
  }
  return searchManager;
}
