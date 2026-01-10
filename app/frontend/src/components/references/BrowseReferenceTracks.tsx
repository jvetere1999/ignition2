/**
 * BrowseReferenceTracks Component
 *
 * Search and view reference tracks from other users by email.
 * Displays tracks in a read-only view with audio playback.
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  usePlayerStore,
  formatTime,
  type QueueTrack,
} from "@/lib/player";
import {
  referenceTracksApi,
  type ReferenceTrackResponse,
  type BrowseTracksResponse,
  ApiClientError,
} from "@/lib/api/reference-tracks";
import styles from "./BrowseReferenceTracks.module.css";

export function BrowseReferenceTracks() {
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState<BrowseTracksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const playerStore = usePlayerStore();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const result = await referenceTracksApi.browseByEmail(email.trim());
      setSearchResult(result);
    } catch (e: unknown) {
      if (e instanceof ApiClientError) {
        if (e.isNotFound()) {
          setError(`No user found with email "${email}"`);
        } else if (e.isAuthError()) {
          setError("Please sign in to browse reference tracks");
        } else {
          setError(e.message);
        }
      } else {
        setError("Failed to search. Please try again.");
      }
      console.error("Browse error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handlePlayTrack = useCallback(async (track: ReferenceTrackResponse) => {
    try {
      // Get signed stream URL
      const { url } = await referenceTracksApi.getStreamUrl(track.id);
      
      const queueTrack: QueueTrack = {
        id: track.id,
        title: track.name,
        artist: track.artist || "Unknown Artist",
        duration: track.duration_seconds || 0,
        audioUrl: url,
        source: "reference",
        referenceTrackId: track.id,
      };

      // Set queue with single track and start playing
      playerStore.setQueue([queueTrack], 0);
      playerStore.setStatus("loading");
      playerStore.setVisible(true);
      setPlayingTrackId(track.id);
    } catch (e) {
      console.error("Failed to play track:", e);
      setError("Failed to play track. It may not be available.");
    }
  }, [playerStore]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Search Form */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInputWrapper}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user email to browse their tracks..."
            className={styles.searchInput}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.searchButton}
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
            Search
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className={styles.error}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Results */}
      {searchResult && (
        <div className={styles.results}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {(searchResult.user_name || searchResult.user_email)[0].toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <h2 className={styles.userName}>
                {searchResult.user_name || "User"}
              </h2>
              <p className={styles.userEmail}>{searchResult.user_email}</p>
              <p className={styles.trackCount}>
                {searchResult.total} reference track{searchResult.total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {searchResult.tracks.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <p>This user hasn&apos;t uploaded any reference tracks yet.</p>
            </div>
          ) : (
            <div className={styles.trackList}>
              {searchResult.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`${styles.trackItem} ${playingTrackId === track.id ? styles.playing : ""}`}
                >
                  <button
                    type="button"
                    className={styles.playButton}
                    onClick={() => handlePlayTrack(track)}
                    aria-label={`Play ${track.name}`}
                  >
                    {playingTrackId === track.id ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>

                  <div className={styles.trackInfo}>
                    <h3 className={styles.trackName}>{track.name}</h3>
                    <div className={styles.trackMeta}>
                      {track.artist && <span>{track.artist}</span>}
                      {track.album && <span>• {track.album}</span>}
                      {track.duration_seconds && (
                        <span>• {formatTime(track.duration_seconds)}</span>
                      )}
                      <span>• {formatFileSize(track.file_size_bytes)}</span>
                    </div>
                    {track.tags && track.tags.length > 0 && (
                      <div className={styles.tags}>
                        {track.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.trackStatus}>
                    <span className={`${styles.statusBadge} ${styles[track.status]}`}>
                      {track.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {searchResult.total > searchResult.page_size && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Page {searchResult.page} of {Math.ceil(searchResult.total / searchResult.page_size)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Back Link */}
      <div className={styles.backLink}>
        <Link href="/reference">
          ← Back to My Reference Library
        </Link>
      </div>
    </div>
  );
}
