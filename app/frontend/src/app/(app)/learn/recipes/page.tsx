/**
 * Recipe Generator Page
 * Generate synthesis recipes/blueprints
 * 
 * Auth is handled by middleware
 */

import type { Metadata } from "next";
import { RecipeClient } from "./RecipeClient";

export const metadata: Metadata = {
  title: "Recipe Generator",
  description: "Generate synthesis recipes and patch blueprints.",
};

export default async function RecipesPage() {
  return <RecipeClient />;
}

