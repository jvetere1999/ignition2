use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// =============================================================================
// Search Index Models
// =============================================================================

/// Represents a searchable piece of content (idea or infobase entry)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchableContent {
    pub id: String,
    pub user_id: Uuid,
    pub content_type: ContentType,
    pub encrypted_text: String, // base64-encoded ciphertext
    pub plaintext_hash: String, // SHA256 hash for edit detection
    pub tags: Vec<String>,      // metadata tags
    pub status: ContentStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Content types that are indexed
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    #[serde(rename = "idea")]
    Idea,
    #[serde(rename = "infobase")]
    Infobase,
}

impl std::fmt::Display for ContentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ContentType::Idea => write!(f, "idea"),
            ContentType::Infobase => write!(f, "infobase"),
        }
    }
}

/// Status of content in the index
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "deleted")]
    Deleted,
}

/// Represents a tokenized word in the index
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexToken {
    pub content_id: String,
    pub word_token: String,
    pub token_type: TokenType,
    pub positions: Vec<usize>, // character positions in original text
    pub frequency: u32,        // count of occurrences
}

/// Type of token (word, phrase, tag, chord)
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TokenType {
    #[serde(rename = "word")]
    Word,
    #[serde(rename = "phrase")]
    Phrase,
    #[serde(rename = "tag")]
    Tag,
    #[serde(rename = "chord")]
    Chord,
}

/// Represents a trie node for prefix searching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrieNode {
    pub prefix: String,
    pub node_type: TrieNodeType,
    pub children: Vec<String>,    // prefixes of child nodes
    pub content_ids: Vec<String>, // content containing this word
    pub frequency: u32,           // total occurrences across all content
}

/// Type of trie node
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrieNodeType {
    #[serde(rename = "prefix")]
    Prefix,
    #[serde(rename = "word")]
    Word,
}

/// Search result returned to client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub content_type: ContentType,
    pub title: String,
    pub preview: String,
    pub highlights: Vec<HighlightSpan>,
    pub relevance_score: f32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Vec<String>,
}

/// Highlight span within a search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightSpan {
    pub position: usize,
    pub length: usize,
    pub text: String,
}

/// Search query parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub content_type: Option<ContentType>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

impl SearchQuery {
    pub fn limit(&self) -> u32 {
        self.limit.unwrap_or(50).min(200) // max 200 results
    }

    pub fn offset(&self) -> u32 {
        self.offset.unwrap_or(0)
    }
}

/// Search response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub success: bool,
    pub results: Vec<SearchResult>,
    pub total_count: u32,
    pub query_time_ms: u32,
    pub client_indexed: bool, // whether index is on client side
}

/// Search index metadata (status, performance metrics)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchIndexMetadata {
    pub user_id: Uuid,
    pub status: IndexStatus,
    pub items_indexed: u32,
    pub last_indexed_at: Option<DateTime<Utc>>,
    pub index_build_time_ms: Option<u32>,
    pub total_content_count: u32,
}

/// Status of the search index
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IndexStatus {
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "building")]
    Building,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "empty")]
    Empty,
}

/// Search index status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchStatusResponse {
    pub indexed: bool,
    pub items_indexed: u32,
    pub last_indexed_at: Option<DateTime<Utc>>,
    pub vault_locked: bool,
}

/// Request to rebuild index (admin/debug)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebuildIndexRequest {
    pub force: Option<bool>,
}

/// Response from rebuild request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebuildIndexResponse {
    pub success: bool,
    pub message: String,
    pub items_indexed: u32,
}

/// Tokenization result for a piece of text
#[derive(Debug, Clone)]
pub struct TokenizationResult {
    pub words: Vec<String>,
    pub phrases: Vec<String>,
    pub chords: Vec<String>,
    pub tags: Vec<String>,
    pub positions: HashMap<String, Vec<usize>>, // word -> positions
}

/// Trie structure for efficient prefix searching
#[derive(Debug, Clone)]
pub struct Trie {
    pub nodes: HashMap<String, TrieNode>,
}

impl Trie {
    pub fn new() -> Self {
        Trie {
            nodes: HashMap::new(),
        }
    }

    /// Insert a word into the trie with associated content_id
    pub fn insert(&mut self, word: &str, content_id: String) {
        let mut prefix = String::new();

        // Build all prefixes
        for ch in word.chars() {
            prefix.push(ch);

            if !self.nodes.contains_key(&prefix) {
                self.nodes.insert(
                    prefix.clone(),
                    TrieNode {
                        prefix: prefix.clone(),
                        node_type: TrieNodeType::Prefix,
                        children: Vec::new(),
                        content_ids: Vec::new(),
                        frequency: 0,
                    },
                );
            }

            let node = self.nodes.get_mut(&prefix).unwrap();
            if !node.content_ids.contains(&content_id) {
                node.content_ids.push(content_id.clone());
            }
            node.frequency += 1;
        }

        // Mark final node as word (terminal node)
        if let Some(node) = self.nodes.get_mut(&prefix) {
            node.node_type = TrieNodeType::Word;
        }

        // Update children pointers for parent nodes
        let mut parent_prefix = String::new();
        for ch in word.chars() {
            parent_prefix.push(ch);
            if let Some(parent) = self.nodes.get_mut(&parent_prefix) {
                let next_prefix = if let Some(next_ch) = word[parent_prefix.len()..].chars().next()
                {
                    let mut tmp = parent_prefix.clone();
                    tmp.push(next_ch);
                    tmp
                } else {
                    parent_prefix.clone()
                };

                if !parent.children.contains(&next_prefix) && next_prefix != parent_prefix {
                    parent.children.push(next_prefix);
                }
            }
        }
    }

    /// Get all content_ids that start with the given prefix
    pub fn get_by_prefix(&self, prefix: &str) -> Vec<String> {
        if let Some(node) = self.nodes.get(prefix) {
            node.content_ids.clone()
        } else {
            Vec::new()
        }
    }

    /// Get a specific node
    pub fn get_node(&self, prefix: &str) -> Option<&TrieNode> {
        self.nodes.get(prefix)
    }

    /// Remove a content_id from all nodes
    pub fn remove_content(&mut self, content_id: &str) {
        for node in self.nodes.values_mut() {
            node.content_ids.retain(|id| id != content_id);
        }
    }

    /// Clear the entire trie
    pub fn clear(&mut self) {
        self.nodes.clear();
    }

    /// Get all nodes (for persistence)
    pub fn get_all_nodes(&self) -> Vec<TrieNode> {
        self.nodes.values().cloned().collect()
    }
}

// =============================================================================
// DTOs for API Requests/Responses
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchDto {
    pub id: String,
    pub content_type: String,
    pub title: String,
    pub preview: String,
    pub highlights: Vec<HighlightDto>,
    pub relevance_score: f32,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HighlightDto {
    pub position: usize,
    pub length: usize,
    pub text: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trie_insert_and_retrieve() {
        let mut trie = Trie::new();
        trie.insert("chord", "idea:123".to_string());
        trie.insert("chordate", "idea:456".to_string());

        assert_eq!(trie.get_by_prefix("chord").len(), 2);
        assert_eq!(trie.get_by_prefix("chordat").len(), 1);
        assert_eq!(trie.get_by_prefix("x").len(), 0);
    }

    #[test]
    fn test_trie_node_types() {
        let mut trie = Trie::new();
        trie.insert("hello", "idea:1".to_string());

        assert_eq!(trie.get_node("h").unwrap().node_type, TrieNodeType::Prefix);
        assert_eq!(
            trie.get_node("hello").unwrap().node_type,
            TrieNodeType::Word
        );
    }

    #[test]
    fn test_trie_remove_content() {
        let mut trie = Trie::new();
        trie.insert("word", "idea:1".to_string());
        trie.insert("word", "idea:2".to_string());

        assert_eq!(trie.get_by_prefix("word").len(), 2);

        trie.remove_content("idea:1");
        assert_eq!(trie.get_by_prefix("word").len(), 1);
        assert!(trie.get_by_prefix("word").contains(&"idea:2".to_string()));
    }

    #[test]
    fn test_search_query_limits() {
        let query = SearchQuery {
            q: "test".to_string(),
            content_type: None,
            limit: Some(500),
            offset: None,
        };

        assert_eq!(query.limit(), 200); // capped at 200
        assert_eq!(query.offset(), 0);
    }
}
