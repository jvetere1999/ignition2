/**
 * Review Page
 * Spaced repetition flashcard review
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { ReviewClient } from "./ReviewClient";

export const metadata: Metadata = {
  title: "Review",
  description: "Review your learning with spaced repetition flashcards.",
};

export default async function ReviewPage() {
  return <ReviewClient />;
}

