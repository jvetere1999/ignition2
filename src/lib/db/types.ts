/**
 * Database entity types
 * Matches D1 schema from migrations
 */

// ============================================
// Common Types
// ============================================

export type ISOTimestamp = string;
export type JSONString = string;

export type QuestStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "deferred"
  | "cancelled";

export type QuestPriority = "low" | "medium" | "high" | "critical";

export type FocusSessionStatus = "active" | "completed" | "abandoned";

export type FocusMode = "focus" | "break" | "long_break";

export type ProjectStatus = "active" | "archived" | "completed";

export type LaneTemplateType = "melody" | "drums" | "chord";

export type PlanTemplateType = "day" | "session" | "week";

export type RecurrenceType = "daily" | "weekly" | "monthly" | "custom";

export type RewardType = "xp" | "achievement" | "streak" | "milestone";

export type CalendarEventType = "meeting" | "appointment" | "workout" | "other";

export type WorkoutType = "strength" | "cardio" | "hiit" | "flexibility" | "mixed";

export type ExerciseCategory = "strength" | "cardio" | "flexibility" | "other";

export type WorkoutSessionStatus = "in-progress" | "completed" | "abandoned";

export type PersonalRecordType = "max_weight" | "max_reps" | "max_volume" | "max_duration";

// ============================================
// Planner Core Entities
// ============================================

export interface LogEvent {
  id: string;
  user_id: string;
  event_type: string;
  payload: JSONString;
  timestamp: ISOTimestamp;
  domain_id: string | null;
  created_at: ISOTimestamp;
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  domain_id: string;
  status: QuestStatus;
  priority: QuestPriority;
  due_date: ISOTimestamp | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  completed_at: ISOTimestamp | null;
  tags: JSONString | null;
  xp_value: number;
  parent_id: string | null;
  content_hash: string;
}

export interface ScheduleRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  domain_id: string;
  enabled: number; // SQLite boolean
  recurrence: RecurrenceType;
  days_of_week: JSONString | null;
  day_of_month: number | null;
  custom_cron: string | null;
  quest_template: JSONString;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  content_hash: string;
}

export interface PlanTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  domain_id: string;
  template_type: PlanTemplateType;
  quest_templates: JSONString;
  tags: JSONString | null;
  estimated_duration: number | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  content_hash: string;
}

export interface SkillTree {
  id: string;
  user_id: string;
  version: number;
  nodes: JSONString;
  total_xp: number;
  achievements: JSONString | null;
  updated_at: ISOTimestamp;
  content_hash: string;
}

export interface RewardLedgerEntry {
  id: string;
  user_id: string;
  domain_id: string;
  reward_type: RewardType;
  amount: number;
  reason: string;
  source_event_id: string | null;
  metadata: JSONString | null;
  created_at: ISOTimestamp;
}

// ============================================
// Focus Domain Entities
// ============================================

export interface FocusSession {
  id: string;
  user_id: string;
  started_at: ISOTimestamp;
  ended_at: ISOTimestamp | null;
  planned_duration: number;
  actual_duration: number | null;
  status: FocusSessionStatus;
  mode: FocusMode;
  metadata: JSONString | null;
  created_at: ISOTimestamp;
  /** Session expiry time - auto-abandon if exceeded */
  expires_at: ISOTimestamp | null;
  /** Linked reference library for focus music */
  linked_library_id: string | null;
}

// ============================================
// Planner Calendar Entities
// ============================================

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_time: ISOTimestamp;
  end_time: ISOTimestamp;
  all_day: number; // SQLite boolean
  location: string | null;
  recurrence_rule: string | null;
  recurrence_end: ISOTimestamp | null;
  parent_event_id: string | null;
  workout_id: string | null;
  color: string | null;
  reminder_minutes: number | null;
  metadata: JSONString | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ============================================
// Exercise Domain Entities
// ============================================

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  category: ExerciseCategory;
  muscle_groups: JSONString | null;
  equipment: JSONString | null;
  instructions: string | null;
  is_builtin: number;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workout_type: WorkoutType;
  estimated_duration: number | null;
  tags: JSONString | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  target_weight: number | null;
  target_duration: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  calendar_event_id: string | null;
  started_at: ISOTimestamp;
  ended_at: ISOTimestamp | null;
  status: WorkoutSessionStatus;
  notes: string | null;
  rating: number | null;
  created_at: ISOTimestamp;
}

export interface ExerciseSet {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  distance: number | null;
  rpe: number | null;
  is_warmup: number;
  is_dropset: number;
  is_failure: number;
  notes: string | null;
  completed_at: ISOTimestamp;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  record_type: PersonalRecordType;
  value: number;
  reps: number | null;
  achieved_at: ISOTimestamp;
  exercise_set_id: string | null;
  previous_value: number | null;
  created_at: ISOTimestamp;
}

// ============================================
// Producing Domain Entities
// ============================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  status: ProjectStatus;
  starred: number; // SQLite boolean
  tags: JSONString | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  content_hash: string;
}

export interface ReferenceLibrary {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface ReferenceTrack {
  id: string;
  library_id: string;
  user_id: string;
  name: string;
  blob_key: string;
  mime_type: string;
  size_bytes: number;
  duration_ms: number | null;
  metadata: JSONString | null;
  created_at: ISOTimestamp;
}

export interface InfobaseEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  tags: JSONString | null;
  pinned: number; // SQLite boolean
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  content_hash: string;
}

export interface LaneTemplate {
  id: string;
  user_id: string;
  name: string;
  template_type: LaneTemplateType;
  lane_settings: JSONString;
  notes: JSONString;
  bpm: number;
  bars: number;
  time_signature: JSONString;
  tags: JSONString | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ============================================
// User Settings
// ============================================

export interface UserSettings {
  user_id: string;
  theme: "light" | "dark" | "system";
  selected_product: string | null;
  keyboard_layout: "mac" | "windows";
  notifications_enabled: number; // SQLite boolean
  focus_default_duration: number;
  focus_break_duration: number;
  focus_long_break_duration: number;
  settings_json: JSONString | null;
  updated_at: ISOTimestamp;
}

// ============================================
// Input Types (for creating/updating)
// ============================================

export type CreateQuestInput = Omit<
  Quest,
  "id" | "created_at" | "updated_at" | "completed_at" | "content_hash"
>;

export type UpdateQuestInput = Partial<
  Omit<Quest, "id" | "user_id" | "created_at" | "content_hash">
>;

export type CreateFocusSessionInput = Omit<
  FocusSession,
  "id" | "ended_at" | "actual_duration" | "created_at"
>;

export type CreateProjectInput = Omit<
  Project,
  "id" | "created_at" | "updated_at" | "content_hash"
>;

export type UpdateProjectInput = Partial<
  Omit<Project, "id" | "user_id" | "created_at" | "content_hash">
>;

export type CreateInfobaseEntryInput = Omit<
  InfobaseEntry,
  "id" | "created_at" | "updated_at" | "content_hash"
>;

export type UpdateInfobaseEntryInput = Partial<
  Omit<InfobaseEntry, "id" | "user_id" | "created_at" | "content_hash">
>;

// Calendar Event inputs
export type CreateCalendarEventInput = Omit<
  CalendarEvent,
  "id" | "created_at" | "updated_at"
>;

export type UpdateCalendarEventInput = Partial<
  Omit<CalendarEvent, "id" | "user_id" | "created_at">
>;

// Exercise inputs
export type CreateExerciseInput = Omit<
  Exercise,
  "id" | "created_at" | "updated_at"
>;

export type UpdateExerciseInput = Partial<
  Omit<Exercise, "id" | "user_id" | "created_at" | "is_builtin">
>;

// Workout inputs
export type CreateWorkoutInput = Omit<
  Workout,
  "id" | "created_at" | "updated_at"
>;

export type UpdateWorkoutInput = Partial<
  Omit<Workout, "id" | "user_id" | "created_at">
>;

// Workout Session inputs
export type CreateWorkoutSessionInput = Omit<
  WorkoutSession,
  "id" | "ended_at" | "created_at"
>;

// Exercise Set inputs
export type CreateExerciseSetInput = Omit<ExerciseSet, "id" | "completed_at">;

