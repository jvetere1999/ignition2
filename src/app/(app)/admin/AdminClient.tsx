"use client";

/**
 * Admin Client Component
 * Full admin dashboard with user management, quests, feedback, and skills
 */

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

type AdminTab = "users" | "quests" | "feedback" | "skills" | "stats";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  approved: boolean;
  createdAt: string;
  level?: number;
  totalXp?: number;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  xpReward: number;
  coinReward: number;
  target: number;
  skillId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Feedback {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface SkillDefinition {
  id: string;
  name: string;
  description: string | null;
  color: string;
  maxLevel: number;
  xpScalingBase: number;
  xpScalingMultiplier: number;
  displayOrder: number;
  isActive: boolean;
}

interface AdminClientProps {
  userEmail: string;
}

export function AdminClient({ userEmail }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuestForm, setShowQuestForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);

  // Quest form state
  const [newQuest, setNewQuest] = useState({
    title: "",
    description: "",
    type: "daily",
    xpReward: 25,
    coinReward: 10,
    target: 1,
    skillId: "proficiency",
  });

  // Skill form state
  const [newSkill, setNewSkill] = useState({
    id: "",
    name: "",
    description: "",
    color: "#8b5cf6",
    maxLevel: 10,
    xpScalingBase: 100,
    xpScalingMultiplier: 1.5,
  });

  // Editing skill state
  const [editingSkill, setEditingSkill] = useState<SkillDefinition | null>(null);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/${activeTab}`);
      if (response.ok) {
        const data = await response.json() as { users?: User[]; quests?: Quest[]; feedback?: Feedback[]; skills?: SkillDefinition[] };
        switch (activeTab) {
          case "users":
            setUsers(data.users || []);
            break;
          case "quests":
            setQuests(data.quests || []);
            break;
          case "feedback":
            setFeedback(data.feedback || []);
            break;
          case "skills":
            setSkills(data.skills || []);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // User actions
  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "approve" }),
      });
      if (response.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, approved: true } : u)));
      }
    } catch (error) {
      console.error("Failed to approve user:", error);
    }
  };

  const handleDenyUser = async (userId: string) => {
    const reason = prompt("Reason for denial (optional):");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "deny", reason }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to deny user:", error);
    }
  };

  // Quest actions
  const handleCreateQuest = async () => {
    try {
      const response = await fetch("/api/admin/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuest),
      });
      if (response.ok) {
        setNewQuest({
          title: "",
          description: "",
          type: "daily",
          xpReward: 25,
          coinReward: 10,
          target: 1,
          skillId: "proficiency",
        });
        setShowQuestForm(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create quest:", error);
    }
  };

  const handleToggleQuest = async (questId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/admin/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, isActive: !isActive }),
      });
      if (response.ok) {
        setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, isActive: !isActive } : q)));
      }
    } catch (error) {
      console.error("Failed to toggle quest:", error);
    }
  };

  // Feedback actions
  const handleUpdateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status }),
      });
      if (response.ok) {
        setFeedback((prev) => prev.map((f) => (f.id === feedbackId ? { ...f, status } : f)));
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
    }
  };

  // Skill actions
  const handleSaveSkill = async () => {
    try {
      const response = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSkill),
      });
      if (response.ok) {
        setNewSkill({
          id: "",
          name: "",
          description: "",
          color: "#8b5cf6",
          maxLevel: 10,
          xpScalingBase: 100,
          xpScalingMultiplier: 1.5,
        });
        setShowSkillForm(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save skill:", error);
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill) return;
    try {
      const response = await fetch("/api/admin/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSkill.id,
          name: editingSkill.name,
          description: editingSkill.description,
          color: editingSkill.color,
          maxLevel: editingSkill.maxLevel,
          xpScalingBase: editingSkill.xpScalingBase,
          xpScalingMultiplier: editingSkill.xpScalingMultiplier,
          isActive: editingSkill.isActive,
        }),
      });
      if (response.ok) {
        setSkills((prev) =>
          prev.map((s) => (s.id === editingSkill.id ? editingSkill : s))
        );
        setEditingSkill(null);
      }
    } catch (error) {
      console.error("Failed to update skill:", error);
    }
  };

  const handleToggleSkill = async (skillId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/admin/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: skillId, isActive: !isActive }),
      });
      if (response.ok) {
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, isActive: !isActive } : s))
        );
      }
    } catch (error) {
      console.error("Failed to toggle skill:", error);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${skillId}"? This cannot be undone.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/skills?id=${skillId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== skillId));
      }
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Console</h1>
          <p className={styles.subtitle}>Logged in as {userEmail}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["users", "quests", "feedback", "skills", "stats"] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "users" && pendingUsers.length > 0 && (
              <span className={styles.badge}>{pendingUsers.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className={styles.section}>
                {pendingUsers.length > 0 && (
                  <>
                    <h2 className={styles.sectionTitle}>Pending Approval ({pendingUsers.length})</h2>
                    <div className={styles.userList}>
                      {pendingUsers.map((user) => (
                        <div key={user.id} className={styles.userCard}>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>{user.name || "No name"}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                            <span className={styles.userDate}>
                              Signed up: {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={styles.userActions}>
                            <button
                              className={styles.approveButton}
                              onClick={() => handleApproveUser(user.id)}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.denyButton}
                              onClick={() => handleDenyUser(user.id)}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h2 className={styles.sectionTitle}>Approved Users ({approvedUsers.length})</h2>
                <div className={styles.userList}>
                  {approvedUsers.map((user) => (
                    <div key={user.id} className={styles.userCard}>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.name || "No name"}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                        <span className={styles.userMeta}>
                          Level {user.level || 1} - {user.totalXp || 0} XP
                        </span>
                      </div>
                      <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quests Tab */}
            {activeTab === "quests" && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Quest Management</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowQuestForm(!showQuestForm)}
                  >
                    {showQuestForm ? "Cancel" : "+ New Quest"}
                  </button>
                </div>

                {showQuestForm && (
                  <div className={styles.form}>
                    <input
                      type="text"
                      placeholder="Quest Title"
                      value={newQuest.title}
                      onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                      className={styles.input}
                    />
                    <textarea
                      placeholder="Description"
                      value={newQuest.description}
                      onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
                      className={styles.textarea}
                    />
                    <div className={styles.formRow}>
                      <select
                        value={newQuest.type}
                        onChange={(e) => setNewQuest({ ...newQuest, type: e.target.value })}
                        className={styles.select}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="special">Special</option>
                        <option value="achievement">Achievement</option>
                      </select>
                      <select
                        value={newQuest.skillId}
                        onChange={(e) => setNewQuest({ ...newQuest, skillId: e.target.value })}
                        className={styles.select}
                      >
                        <option value="proficiency">Proficiency</option>
                        <option value="knowledge">Knowledge</option>
                        <option value="guts">Guts</option>
                        <option value="kindness">Kindness</option>
                        <option value="charm">Charm</option>
                      </select>
                    </div>
                    <div className={styles.formRow}>
                      <input
                        type="number"
                        placeholder="XP Reward"
                        value={newQuest.xpReward}
                        onChange={(e) => setNewQuest({ ...newQuest, xpReward: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                      />
                      <input
                        type="number"
                        placeholder="Coin Reward"
                        value={newQuest.coinReward}
                        onChange={(e) => setNewQuest({ ...newQuest, coinReward: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                      />
                      <input
                        type="number"
                        placeholder="Target"
                        value={newQuest.target}
                        onChange={(e) => setNewQuest({ ...newQuest, target: parseInt(e.target.value) || 1 })}
                        className={styles.input}
                      />
                    </div>
                    <button className={styles.submitButton} onClick={handleCreateQuest}>
                      Create Quest
                    </button>
                  </div>
                )}

                <div className={styles.questList}>
                  {quests.map((quest) => (
                    <div key={quest.id} className={`${styles.questCard} ${!quest.isActive ? styles.inactive : ""}`}>
                      <div className={styles.questInfo}>
                        <div className={styles.questHeader}>
                          <span className={styles.questTitle}>{quest.title}</span>
                          <span className={`${styles.questType} ${styles[quest.type]}`}>{quest.type}</span>
                        </div>
                        <p className={styles.questDescription}>{quest.description}</p>
                        <div className={styles.questMeta}>
                          <span>+{quest.xpReward} XP</span>
                          <span>+{quest.coinReward} Coins</span>
                          <span>Target: {quest.target}</span>
                          <span>Skill: {quest.skillId}</span>
                        </div>
                      </div>
                      <button
                        className={quest.isActive ? styles.deactivateButton : styles.activateButton}
                        onClick={() => handleToggleQuest(quest.id, quest.isActive)}
                      >
                        {quest.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>User Feedback</h2>
                <div className={styles.feedbackList}>
                  {feedback.length === 0 ? (
                    <p className={styles.emptyState}>No feedback submitted yet.</p>
                  ) : (
                    feedback.map((item) => (
                      <div key={item.id} className={styles.feedbackCard}>
                        <div className={styles.feedbackHeader}>
                          <span className={`${styles.feedbackType} ${styles[item.type]}`}>{item.type}</span>
                          <span className={`${styles.feedbackStatus} ${styles[item.status]}`}>{item.status}</span>
                        </div>
                        <h3 className={styles.feedbackTitle}>{item.title}</h3>
                        <p className={styles.feedbackDescription}>{item.description}</p>
                        <div className={styles.feedbackMeta}>
                          <span>From: {item.userEmail || item.userId}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.feedbackActions}>
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value)}
                            className={styles.statusSelect}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === "skills" && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Skill Definitions</h2>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowSkillForm(!showSkillForm)}
                  >
                    {showSkillForm ? "Cancel" : "+ New Skill"}
                  </button>
                </div>

                {showSkillForm && (
                  <div className={styles.form}>
                    <div className={styles.formRow}>
                      <input
                        type="text"
                        placeholder="Skill ID (e.g., wisdom)"
                        value={newSkill.id}
                        onChange={(e) => setNewSkill({ ...newSkill, id: e.target.value })}
                        className={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description"
                      value={newSkill.description}
                      onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                      className={styles.input}
                    />
                    <div className={styles.formRow}>
                      <div className={styles.colorInputWrapper}>
                        <label className={styles.inputLabel}>Color</label>
                        <input
                          type="color"
                          value={newSkill.color}
                          onChange={(e) => setNewSkill({ ...newSkill, color: e.target.value })}
                          className={styles.colorInput}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Max Level</label>
                        <input
                          type="number"
                          value={newSkill.maxLevel}
                          onChange={(e) => setNewSkill({ ...newSkill, maxLevel: parseInt(e.target.value) || 10 })}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Base XP</label>
                        <input
                          type="number"
                          value={newSkill.xpScalingBase}
                          onChange={(e) => setNewSkill({ ...newSkill, xpScalingBase: parseInt(e.target.value) || 100 })}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>XP Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newSkill.xpScalingMultiplier}
                          onChange={(e) => setNewSkill({ ...newSkill, xpScalingMultiplier: parseFloat(e.target.value) || 1.5 })}
                          className={styles.input}
                        />
                      </div>
                    </div>
                    <button className={styles.submitButton} onClick={handleSaveSkill}>
                      Create Skill
                    </button>
                  </div>
                )}

                {/* Edit Skill Modal */}
                {editingSkill && (
                  <div className={styles.form}>
                    <h3 className={styles.formTitle}>Edit Skill: {editingSkill.id}</h3>
                    <div className={styles.formRow}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Display Name</label>
                        <input
                          type="text"
                          value={editingSkill.name}
                          onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.colorInputWrapper}>
                        <label className={styles.inputLabel}>Color</label>
                        <input
                          type="color"
                          value={editingSkill.color}
                          onChange={(e) => setEditingSkill({ ...editingSkill, color: e.target.value })}
                          className={styles.colorInput}
                        />
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Description</label>
                      <input
                        type="text"
                        value={editingSkill.description || ""}
                        onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Max Level</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editingSkill.maxLevel}
                          onChange={(e) => setEditingSkill({ ...editingSkill, maxLevel: parseInt(e.target.value) || 10 })}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Base XP (per level)</label>
                        <input
                          type="number"
                          min="1"
                          value={editingSkill.xpScalingBase}
                          onChange={(e) => setEditingSkill({ ...editingSkill, xpScalingBase: parseInt(e.target.value) || 100 })}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>XP Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          value={editingSkill.xpScalingMultiplier}
                          onChange={(e) => setEditingSkill({ ...editingSkill, xpScalingMultiplier: parseFloat(e.target.value) || 1.5 })}
                          className={styles.input}
                        />
                      </div>
                    </div>
                    <p className={styles.formHint}>
                      XP for level N = Base * Multiplier^(N-1).
                      Example: Level 5 = {editingSkill.xpScalingBase} * {editingSkill.xpScalingMultiplier}^4 = {Math.round(editingSkill.xpScalingBase * Math.pow(editingSkill.xpScalingMultiplier, 4))} XP
                    </p>
                    <div className={styles.formRow}>
                      <button className={styles.submitButton} onClick={handleUpdateSkill}>
                        Save Changes
                      </button>
                      <button className={styles.cancelButton} onClick={() => setEditingSkill(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.skillList}>
                  {skills.length === 0 ? (
                    <p className={styles.emptyState}>No skills defined yet. Create one above.</p>
                  ) : (
                    skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`${styles.skillCard} ${!skill.isActive ? styles.inactive : ""}`}
                        style={{ borderLeftColor: skill.color }}
                      >
                        <div className={styles.skillInfo}>
                          <div className={styles.skillHeader}>
                            <span className={styles.skillName} style={{ color: skill.color }}>{skill.name}</span>
                            <span className={styles.skillId}>({skill.id})</span>
                            {!skill.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                          </div>
                          <p className={styles.skillDescription}>{skill.description || "No description"}</p>
                          <div className={styles.skillMeta}>
                            <span>Max Level: {skill.maxLevel}</span>
                            <span>Base XP: {skill.xpScalingBase}</span>
                            <span>Multiplier: {skill.xpScalingMultiplier}x</span>
                            <span>Order: {skill.displayOrder}</span>
                          </div>
                        </div>
                        <div className={styles.skillActions}>
                          <button
                            className={styles.editButton}
                            onClick={() => setEditingSkill(skill)}
                            title="Edit skill"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className={skill.isActive ? styles.deactivateButton : styles.activateButton}
                            onClick={() => handleToggleSkill(skill.id, skill.isActive)}
                            title={skill.isActive ? "Deactivate" : "Activate"}
                          >
                            {skill.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteSkill(skill.id)}
                            title="Delete skill"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === "stats" && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Platform Statistics</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{users.length}</span>
                    <span className={styles.statLabel}>Total Users</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{approvedUsers.length}</span>
                    <span className={styles.statLabel}>Approved</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{pendingUsers.length}</span>
                    <span className={styles.statLabel}>Pending</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{quests.filter((q) => q.isActive).length}</span>
                    <span className={styles.statLabel}>Active Quests</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{feedback.filter((f) => f.status === "open").length}</span>
                    <span className={styles.statLabel}>Open Feedback</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

