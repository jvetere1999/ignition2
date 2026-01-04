"use client";

/**
 * Market Client Component
 * Spend coins on personal rewards
 */

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: "food" | "entertainment" | "selfcare" | "custom";
  icon: string;
  purchased?: boolean;
  purchasedAt?: string;
}

// Storage keys
const WALLET_KEY = "passion_wallet_v1";
const REWARDS_KEY = "passion_rewards_v1";
const PURCHASES_KEY = "passion_purchases_v1";

// Default rewards
const DEFAULT_REWARDS: Reward[] = [
  {
    id: "takeout-1",
    name: "Order Takeout",
    description: "Treat yourself to your favorite restaurant",
    cost: 100,
    category: "food",
    icon: "takeout",
  },
  {
    id: "coffee-1",
    name: "Fancy Coffee",
    description: "Get that special latte you've been eyeing",
    cost: 50,
    category: "food",
    icon: "coffee",
  },
  {
    id: "snack-1",
    name: "Snack Run",
    description: "Grab some treats from the store",
    cost: 30,
    category: "food",
    icon: "snack",
  },
  {
    id: "movie-1",
    name: "Movie Night",
    description: "Watch a movie guilt-free",
    cost: 75,
    category: "entertainment",
    icon: "movie",
  },
  {
    id: "game-1",
    name: "Gaming Session",
    description: "1 hour of uninterrupted gaming",
    cost: 60,
    category: "entertainment",
    icon: "game",
  },
  {
    id: "sleep-1",
    name: "Sleep In",
    description: "Skip the early alarm tomorrow",
    cost: 80,
    category: "selfcare",
    icon: "sleep",
  },
  {
    id: "bath-1",
    name: "Spa Time",
    description: "Take a long relaxing bath",
    cost: 40,
    category: "selfcare",
    icon: "spa",
  },
  {
    id: "nap-1",
    name: "Power Nap",
    description: "Take a guilt-free 30min nap",
    cost: 25,
    category: "selfcare",
    icon: "nap",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food & Drinks",
  entertainment: "Entertainment",
  selfcare: "Self Care",
  custom: "Custom Rewards",
};

export function MarketClient() {
  const [wallet, setWallet] = useState({ coins: 0, totalXp: 0 });
  const [rewards, setRewards] = useState<Reward[]>(DEFAULT_REWARDS);
  const [purchases, setPurchases] = useState<Reward[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showPurchased, setShowPurchased] = useState(false);

  // Load data
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem(WALLET_KEY);
      const storedRewards = localStorage.getItem(REWARDS_KEY);
      const storedPurchases = localStorage.getItem(PURCHASES_KEY);

      if (storedWallet) setWallet(JSON.parse(storedWallet));
      if (storedRewards) setRewards(JSON.parse(storedRewards));
      if (storedPurchases) setPurchases(JSON.parse(storedPurchases));
    } catch (e) {
      console.error("Failed to load market data:", e);
    }
    setIsLoading(false);
  }, []);

  // Save wallet
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    }
  }, [wallet, isLoading]);

  // Save purchases
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
    }
  }, [purchases, isLoading]);

  // Purchase a reward
  const handlePurchase = useCallback((reward: Reward) => {
    if (wallet.coins < reward.cost) return;

    setWallet((prev) => ({
      ...prev,
      coins: prev.coins - reward.cost,
    }));

    const purchase: Reward = {
      ...reward,
      purchased: true,
      purchasedAt: new Date().toISOString(),
    };

    setPurchases((prev) => [purchase, ...prev]);
  }, [wallet.coins]);

  // Add coins (for testing)
  const handleAddCoins = useCallback(() => {
    setWallet((prev) => ({ ...prev, coins: prev.coins + 50 }));
  }, []);

  const categories = ["all", "food", "entertainment", "selfcare", "custom"];
  const filteredRewards = activeCategory === "all"
    ? rewards
    : rewards.filter((r) => r.category === activeCategory);

  if (isLoading) {
    return <div className={styles.page}><div className={styles.loading}>Loading market...</div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Market</h1>
            <p className={styles.subtitle}>Spend your hard-earned coins</p>
          </div>
          <div className={styles.walletDisplay}>
            <span className={styles.coinIcon}>*</span>
            <span className={styles.walletValue}>{wallet.coins}</span>
            <button className={styles.addCoinsButton} onClick={handleAddCoins}>
              +50
            </button>
          </div>
        </div>
      </header>

      {/* View Toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${!showPurchased ? styles.active : ""}`}
          onClick={() => setShowPurchased(false)}
        >
          Shop
        </button>
        <button
          className={`${styles.toggleButton} ${showPurchased ? styles.active : ""}`}
          onClick={() => setShowPurchased(true)}
        >
          Purchases ({purchases.length})
        </button>
      </div>

      {!showPurchased ? (
        <>
          {/* Categories */}
          <div className={styles.categories}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.categoryButton} ${activeCategory === cat ? styles.active : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className={styles.rewardsGrid}>
            {filteredRewards.map((reward) => (
              <div key={reward.id} className={styles.rewardCard}>
                <div className={styles.rewardIcon}>
                  {reward.icon === "takeout" && "O"}
                  {reward.icon === "coffee" && "C"}
                  {reward.icon === "snack" && "S"}
                  {reward.icon === "movie" && "M"}
                  {reward.icon === "game" && "G"}
                  {reward.icon === "sleep" && "Z"}
                  {reward.icon === "spa" && "~"}
                  {reward.icon === "nap" && "N"}
                </div>
                <h3 className={styles.rewardName}>{reward.name}</h3>
                <p className={styles.rewardDescription}>{reward.description}</p>
                <div className={styles.rewardFooter}>
                  <span className={styles.rewardCost}>
                    <span className={styles.coinSmall}>*</span>
                    {reward.cost}
                  </span>
                  <button
                    className={styles.buyButton}
                    disabled={wallet.coins < reward.cost}
                    onClick={() => handlePurchase(reward)}
                  >
                    {wallet.coins < reward.cost ? "Need more" : "Redeem"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Purchases List */
        <div className={styles.purchasesList}>
          {purchases.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No purchases yet. Start spending those coins!</p>
            </div>
          ) : (
            purchases.map((purchase, i) => (
              <div key={`${purchase.id}-${i}`} className={styles.purchaseItem}>
                <div className={styles.purchaseInfo}>
                  <h3 className={styles.purchaseName}>{purchase.name}</h3>
                  <span className={styles.purchaseDate}>
                    {purchase.purchasedAt
                      ? new Date(purchase.purchasedAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
                <span className={styles.purchaseCost}>-{purchase.cost} *</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

