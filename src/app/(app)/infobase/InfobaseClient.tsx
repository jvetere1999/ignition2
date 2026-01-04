"use client";

/**
 * Infobase Client Component
 * Interactive knowledge base with CRUD operations
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./page.module.css";

interface InfoEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "passion_infobase_v1";

const DEFAULT_CATEGORIES = [
  "All Entries",
  "Mixing",
  "Sound Design",
  "Music Theory",
  "Workflow",
  "Tips",
  "Resources",
];

export function InfobaseClient() {
  const [entries, setEntries] = useState<InfoEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All Entries");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<InfoEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("Tips");
  const [formTags, setFormTags] = useState("");

  // Load entries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load infobase:", e);
    }
  }, []);

  // Save entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to save infobase:", e);
    }
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory =
        selectedCategory === "All Entries" || entry.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [entries, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Entries": entries.length };
    for (const entry of entries) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }
    return counts;
  }, [entries]);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("Tips");
    setFormTags("");
    setIsEditing(false);
    setIsCreating(false);
    setSelectedEntry(null);
  }, []);

  const handleCreate = useCallback(() => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedEntry(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("Tips");
    setFormTags("");
  }, []);

  const handleEdit = useCallback((entry: InfoEntry) => {
    setSelectedEntry(entry);
    setIsEditing(true);
    setIsCreating(false);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormCategory(entry.category);
    setFormTags(entry.tags.join(", "));
  }, []);

  const handleSave = useCallback(() => {
    if (!formTitle.trim()) return;

    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isCreating) {
      const newEntry: InfoEntry = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
      setSelectedEntry(newEntry);
    } else if (selectedEntry) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id
            ? {
                ...e,
                title: formTitle.trim(),
                content: formContent.trim(),
                category: formCategory,
                tags,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
      setSelectedEntry({
        ...selectedEntry,
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        tags,
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditing(false);
    setIsCreating(false);
  }, [isCreating, selectedEntry, formTitle, formContent, formCategory, formTags]);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this entry?")) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        if (selectedEntry?.id === id) {
          setSelectedEntry(null);
        }
      }
    },
    [selectedEntry]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Infobase</h1>
        <p className={styles.subtitle}>Your personal knowledge base.</p>
      </header>

      <div className={styles.toolbar}>
        <button className={styles.addButton} onClick={handleCreate}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Entry</span>
        </button>

        <div className={styles.searchBar}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={styles.searchIcon}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search entries..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Categories</h3>
          <ul className={styles.categoryList}>
            {DEFAULT_CATEGORIES.map((category) => (
              <li key={category} className={styles.categoryItem}>
                <button
                  className={`${styles.categoryButton} ${
                    selectedCategory === category ? styles.active : ""
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                  {categoryCounts[category] ? (
                    <span className={styles.categoryCount}>
                      {categoryCounts[category]}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.entries}>
          {isEditing ? (
            <div className={styles.editor}>
              <div className={styles.editorHeader}>
                <h2>{isCreating ? "New Entry" : "Edit Entry"}</h2>
                <div className={styles.editorActions}>
                  <button className={styles.cancelBtn} onClick={resetForm}>
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={!formTitle.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className={styles.editorForm}>
                <input
                  type="text"
                  className={styles.editorTitle}
                  placeholder="Entry title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                />
                <div className={styles.editorMeta}>
                  <select
                    className={styles.editorCategory}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {DEFAULT_CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className={styles.editorTags}
                    placeholder="Tags (comma separated)"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>
                <textarea
                  className={styles.editorContent}
                  placeholder="Write your notes here..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={15}
                />
              </div>
            </div>
          ) : selectedEntry ? (
            <div className={styles.entryDetail}>
              <div className={styles.entryDetailHeader}>
                <button
                  className={styles.backButton}
                  onClick={() => setSelectedEntry(null)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
                <div className={styles.entryDetailActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => handleEdit(selectedEntry)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(selectedEntry.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <h2 className={styles.entryDetailTitle}>{selectedEntry.title}</h2>
              <div className={styles.entryDetailMeta}>
                <span className={styles.entryCategory}>{selectedEntry.category}</span>
                <span className={styles.entryDate}>
                  Updated {new Date(selectedEntry.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {selectedEntry.tags.length > 0 && (
                <div className={styles.entryTags}>
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.entryDetailContent}>
                {selectedEntry.content || (
                  <span className={styles.emptyContent}>No content</span>
                )}
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>
                {searchQuery ? "No matches found" : "No entries yet"}
              </h3>
              <p className={styles.emptyText}>
                {searchQuery
                  ? "Try a different search term."
                  : "Start building your knowledge base by adding your first entry."}
              </p>
              {!searchQuery && (
                <button className={styles.emptyAction} onClick={handleCreate}>
                  Create Entry
                </button>
              )}
            </div>
          ) : (
            <div className={styles.entryList}>
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  className={styles.entryCard}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <h3 className={styles.entryTitle}>{entry.title}</h3>
                  <p className={styles.entryPreview}>
                    {entry.content.slice(0, 120)}
                    {entry.content.length > 120 ? "..." : ""}
                  </p>
                  <div className={styles.entryMeta}>
                    <span className={styles.entryCategory}>{entry.category}</span>
                    <span className={styles.entryDate}>
                      {new Date(entry.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default InfobaseClient;

