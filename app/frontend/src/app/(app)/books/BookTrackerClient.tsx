"use client";

/**
 * Book Tracker Client Component
 * Track reading progress, log books, and build reading habits
 *
 * Auto-refresh: Refetches on focus after 2 minutes staleness (per SYNC.md)
 */

import { useState, useEffect, useCallback } from "react";
import { safeFetch, API_BASE_URL } from "@/lib/api";
import { useAutoRefresh } from "@/lib/hooks";
import styles from "./page.module.css";

interface Book {
  id: string;
  title: string;
  author: string | null;
  total_pages: number | null;
  current_page: number;
  progress_percent: number | null;
  status: "reading" | "completed" | "want_to_read" | "abandoned";
  rating: number | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface ReadingStats {
  books_completed: number;
  books_reading: number;
  total_books: number;
  total_pages_read: number;
  total_reading_time_minutes: number;
}

export function BookTrackerClient() {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<ReadingStats>({
    books_completed: 0,
    books_reading: 0,
    total_books: 0,
    total_pages_read: 0,
    total_reading_time_minutes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reading" | "completed" | "all" | "want">("reading");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showLogSession, setShowLogSession] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Form state
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    totalPages: 0,
    notes: "",
  });

  const [sessionLog, setSessionLog] = useState({
    bookId: "",
    pagesRead: 0,
    duration: 30,
    notes: "",
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [booksRes, statsRes] = await Promise.all([
        safeFetch(`${API_BASE_URL}/api/books`),
        safeFetch(`${API_BASE_URL}/api/books/stats`),
      ]);

      if (booksRes.ok) {
        const response_data = await booksRes.json() as { data: { books?: Book[] } };
        setBooks(response_data.data?.books || []);
      }

      if (statsRes.ok) {
        const response_data = await statsRes.json() as { data: { stats?: ReadingStats } };
        setStats(
          response_data.data?.stats || {
            books_completed: 0,
            books_reading: 0,
            total_books: 0,
            total_pages_read: 0,
            total_reading_time_minutes: 0,
          }
        );
      }
    } catch (error) {
      console.error("Failed to load books:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  // Auto-refresh: refetch on focus after 2 minute staleness (per SYNC.md)
  // Pauses on page unload, soft refreshes on reload if stale
  useAutoRefresh({
    onRefresh: loadData,
    refreshKey: "books",
    stalenessMs: 120000, // 2 minutes per SYNC.md contract
    refreshOnMount: true,
    refetchOnFocus: true,
    refetchOnVisible: true,
    enabled: !isLoading && !showAddBook && !showLogSession,
  });

  // Add book
  const handleAddBook = async () => {
    if (!newBook.title.trim()) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newBook.title.trim(),
          author: newBook.author.trim() || undefined,
          total_pages: newBook.totalPages > 0 ? newBook.totalPages : undefined,
          status: "want_to_read",
        }),
      });

      if (res.ok) {
        const response_data = await res.json() as { data: { book?: Book } };
        if (response_data.data?.book?.id && newBook.notes.trim()) {
          await safeFetch(`${API_BASE_URL}/api/books/${response_data.data.book.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: newBook.notes.trim() }),
          });
        }
        setShowAddBook(false);
        setNewBook({ title: "", author: "", totalPages: 0, notes: "" });
        loadData();
      }
    } catch (error) {
      console.error("Failed to add book:", error);
    }
  };

  // Start reading a book
  const handleStartReading = async (bookId: string) => {
    try {
      await safeFetch(`${API_BASE_URL}/api/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "reading",
        }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to start reading:", error);
    }
  };

  // Log reading session
  const handleLogSession = async () => {
    if (!sessionLog.bookId || sessionLog.pagesRead <= 0) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/api/books/${sessionLog.bookId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages_read: sessionLog.pagesRead,
          duration_minutes: sessionLog.duration > 0 ? sessionLog.duration : undefined,
          notes: sessionLog.notes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowLogSession(false);
        setSessionLog({ bookId: "", pagesRead: 0, duration: 30, notes: "" });
        loadData();
      }
    } catch (error) {
      console.error("Failed to log session:", error);
    }
  };

  // Mark book as completed
  const handleCompleteBook = async (bookId: string, rating: number) => {
    try {
      await safeFetch(`${API_BASE_URL}/api/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          rating,
        }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to complete book:", error);
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Delete this book?")) return;

    try {
      await safeFetch(`${API_BASE_URL}/api/books/${bookId}`, { method: "DELETE" });
      loadData();
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  };

  // Filter books by tab
  const filteredBooks = books.filter((book) => {
    switch (activeTab) {
      case "reading":
        return book.status === "reading";
      case "completed":
        return book.status === "completed";
      case "want":
        return book.status === "want_to_read";
      default:
        return true;
    }
  });

  // Currently reading books for session logging
  const readingBooks = books.filter((b) => b.status === "reading");

  if (isLoading) {
    return <div className={styles.loading}>Loading your library...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.books_completed}</span>
          <span className={styles.statLabel}>Books Completed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.books_reading}</span>
          <span className={styles.statLabel}>Currently Reading</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total_pages_read}</span>
          <span className={styles.statLabel}>Pages Read</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatReadingTime(stats.total_reading_time_minutes)}</span>
          <span className={styles.statLabel}>Reading Time</span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={() => setShowAddBook(true)}>
          Add Book
        </button>
        {readingBooks.length > 0 && (
          <button className={styles.secondaryButton} onClick={() => setShowLogSession(true)}>
            Log Reading Session
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "reading" ? styles.active : ""}`}
          onClick={() => setActiveTab("reading")}
        >
          Currently Reading ({books.filter((b) => b.status === "reading").length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "completed" ? styles.active : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed ({books.filter((b) => b.status === "completed").length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "want" ? styles.active : ""}`}
          onClick={() => setActiveTab("want")}
        >
          Want to Read ({books.filter((b) => b.status === "want_to_read").length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === "all" ? styles.active : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All ({books.length})
        </button>
      </div>

      {/* Book List */}
      <div className={styles.bookGrid}>
        {filteredBooks.map((book) => (
          <div key={book.id} className={styles.bookCard}>
            <div className={styles.bookCover}>
              <div className={styles.placeholderCover}>
                <span>{book.title.charAt(0)}</span>
              </div>
            </div>
            <div className={styles.bookInfo}>
              <h3 className={styles.bookTitle}>{book.title}</h3>
              <p className={styles.bookAuthor}>{book.author || "Unknown author"}</p>

              {book.status === "reading" && (
                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${book.total_pages ? (book.current_page / book.total_pages) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {book.current_page} / {book.total_pages ?? 0} pages
                  </span>
                </div>
              )}

              {book.status === "completed" && book.rating && (
                <div className={styles.rating}>
                  {"*".repeat(book.rating)}{"*".repeat(5 - book.rating).split("").map(() => "-").join("")}
                </div>
              )}

              <div className={styles.bookActions}>
                {book.status === "want_to_read" && (
                  <button
                    className={styles.smallButton}
                    onClick={() => handleStartReading(book.id)}
                  >
                    Start Reading
                  </button>
                )}
                {book.status === "reading" && (
                  <>
                    <button
                      className={styles.smallButton}
                      onClick={() => {
                        setSessionLog({ ...sessionLog, bookId: book.id });
                        setShowLogSession(true);
                      }}
                    >
                      Log Progress
                    </button>
                    <button
                      className={styles.smallButton}
                      onClick={() => setSelectedBook(book)}
                    >
                      Finish
                    </button>
                  </>
                )}
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteBook(book.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredBooks.length === 0 && (
          <div className={styles.emptyState}>
            <p>No books in this category yet.</p>
            <button onClick={() => setShowAddBook(true)}>Add your first book</button>
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddBook && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Add New Book</h2>
            <div className={styles.form}>
              <input
                type="text"
                placeholder="Book title"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Author"
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
              />
              <input
                type="number"
                placeholder="Total pages"
                value={newBook.totalPages || ""}
                onChange={(e) => setNewBook({ ...newBook, totalPages: parseInt(e.target.value) || 0 })}
              />
              <textarea
                placeholder="Notes (optional)"
                value={newBook.notes}
                onChange={(e) => setNewBook({ ...newBook, notes: e.target.value })}
              />
              <div className={styles.modalActions}>
                <button onClick={() => setShowAddBook(false)}>Cancel</button>
                <button onClick={handleAddBook} disabled={!newBook.title.trim()}>
                  Add Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Session Modal */}
      {showLogSession && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Log Reading Session</h2>
            <div className={styles.form}>
              <select
                value={sessionLog.bookId}
                onChange={(e) => setSessionLog({ ...sessionLog, bookId: e.target.value })}
              >
                <option value="">Select a book</option>
                {readingBooks.map((book) => (
                  <option key={book.id} value={book.id}>{book.title}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Pages read"
                value={sessionLog.pagesRead || ""}
                onChange={(e) => setSessionLog({ ...sessionLog, pagesRead: parseInt(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={sessionLog.duration || ""}
                onChange={(e) => setSessionLog({ ...sessionLog, duration: parseInt(e.target.value) || 0 })}
              />
              <textarea
                placeholder="Notes (optional)"
                value={sessionLog.notes}
                onChange={(e) => setSessionLog({ ...sessionLog, notes: e.target.value })}
              />
              <div className={styles.modalActions}>
                <button onClick={() => setShowLogSession(false)}>Cancel</button>
                <button
                  onClick={handleLogSession}
                  disabled={!sessionLog.bookId || sessionLog.pagesRead <= 0}
                >
                  Log Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Book Modal */}
      {selectedBook && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Finish &quot;{selectedBook.title}&quot;</h2>
            <p>How would you rate this book?</p>
            <div className={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={styles.ratingButton}
                  onClick={() => {
                    handleCompleteBook(selectedBook.id, rating);
                    setSelectedBook(null);
                  }}
                >
                  {rating} {"*".repeat(rating)}
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedBook(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
