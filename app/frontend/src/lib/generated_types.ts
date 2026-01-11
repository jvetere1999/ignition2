// GENERATED FROM schema.json - DO NOT EDIT

export interface Accounts {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  created_at: string;
  updated_at: string;
}

export interface AchievementDefinitions {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  reward_coins: number;
  reward_xp: number;
  is_hidden: boolean;
  sort_order: number;
  created_at: string;
}

export interface ActivityEvents {
  id: string;
  user_id: string;
  event_type: string;
  category?: string;
  metadata?: Record<string, unknown>;
  xp_earned: number;
  coins_earned: number;
  created_at: string;
}

export interface AnalysisEvents {
  id: string;
  analysis_id: string;
  time_ms: number;
  duration_ms?: number;
  event_type: string;
  event_data?: Record<string, unknown>;
  confidence?: number;
  created_at: string;
}

export interface AnalysisFrameData {
  id: string;
  manifest_id: string;
  chunk_index: number;
  start_frame: number;
  end_frame: number;
  start_time_ms: number;
  end_time_ms: number;
  frame_data: Uint8Array;
  frame_count: number;
  compressed: boolean;
  compression_type?: string;
  created_at: string;
}

export interface AnalysisFrameManifests {
  id: string;
  analysis_id: string;
  manifest_version: number;
  hop_ms: number;
  frame_count: number;
  duration_ms: number;
  sample_rate: number;
  bands: number;
  bytes_per_frame: number;
  frame_layout: Record<string, unknown>;
  events?: Record<string, unknown>;
  fingerprint?: string;
  analyzer_version: string;
  chunk_size_frames: number;
  total_chunks: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  session_id?: string;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  status: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: string;
}

export interface Authenticators {
  id: string;
  user_id: string;
  credential_id: string;
  provider_account_id: string;
  credential_public_key: string;
  counter: number;
  credential_device_type: string;
  credential_backed_up: boolean;
  transports: string[];
  created_at: string;
}

export interface Books {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  total_pages?: number;
  current_page: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  rating?: number;
  notes?: string;
  cover_url?: string;
  isbn?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvents {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  event_type: string;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  timezone?: string;
  location?: string;
  workout_id?: string;
  habit_id?: string;
  goal_id?: string;
  recurrence_rule?: string;
  recurrence_end?: string;
  parent_event_id?: string;
  color?: string;
  reminder_minutes?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DailyPlans {
  id: string;
  user_id: string;
  date: string;
  items: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Entitlements {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface ExerciseSets {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration?: number;
  is_warmup: boolean;
  is_dropset: boolean;
  rpe?: number;
  notes?: string;
  completed_at: string;
}

export interface Exercises {
  id: string;
  name: string;
  description?: string;
  category: string;
  muscle_groups?: string[];
  equipment?: string[];
  instructions?: string;
  video_url?: string;
  is_custom: boolean;
  is_builtin: boolean;
  user_id?: string;
  created_at: string;
}

export interface FeatureFlags {
  id: string;
  flag_name: string;
  enabled: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  feedback_type: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  admin_response?: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FocusLibraries {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  library_type: string;
  tracks_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface FocusLibraryTracks {
  id: string;
  library_id: string;
  track_id?: string;
  track_title: string;
  track_url?: string;
  duration_seconds?: number;
  sort_order: number;
  added_at: string;
}

export interface FocusPauseState {
  id: string;
  user_id: string;
  session_id: string;
  is_paused: boolean;
  time_remaining_seconds?: number;
  paused_at?: string;
  resumed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FocusSessions {
  id: string;
  user_id: string;
  mode: string;
  duration_seconds: number;
  started_at: string;
  completed_at?: string;
  abandoned_at?: string;
  expires_at?: string;
  status: string;
  xp_awarded: number;
  coins_awarded: number;
  task_id?: string;
  task_title?: string;
  created_at: string;
}

export interface GoalMilestones {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  sort_order: number;
}

export interface Goals {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  started_at?: string;
  completed_at?: string;
  status: string;
  progress: number;
  priority: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletions {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  completed_date: string;
  notes?: string;
}

export interface Habits {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: string;
  target_count: number;
  custom_days?: number[];
  icon?: string;
  color?: string;
  is_active: boolean;
  current_streak: number;
  longest_streak: number;
  last_completed_at?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Ideas {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxItems {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  item_type: string;
  tags?: string[];
  is_processed: boolean;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InfobaseEntries {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearnDrills {
  id: string;
  topic_id: string;
  key: string;
  title: string;
  description?: string;
  drill_type: string;
  config_json: Record<string, unknown>;
  difficulty: string;
  duration_seconds?: number;
  xp_reward: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LearnLessons {
  id: string;
  topic_id: string;
  key: string;
  title: string;
  description?: string;
  content_markdown?: string;
  duration_minutes?: number;
  difficulty: string;
  quiz_json?: Record<string, unknown>;
  xp_reward: number;
  coin_reward: number;
  skill_key?: string;
  skill_star_reward: number;
  audio_r2_key?: string;
  video_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LearnTopics {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ListeningPromptPresets {
  id: string;
  name: string;
  description?: string;
  template_id: string;
  preset_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ListeningPromptTemplates {
  id: string;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  prompt_text: string;
  hints?: Record<string, unknown>;
  expected_observations?: Record<string, unknown>;
  tags?: string[];
  display_order: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketItems {
  id: string;
  key?: string;
  name: string;
  description?: string;
  category: string;
  cost_coins: number;
  rarity: string;
  icon?: string;
  icon_url?: string;
  image_url?: string;
  is_global: boolean;
  is_available: boolean;
  is_active: boolean;
  is_consumable: boolean;
  uses_per_purchase?: number;
  total_stock?: number;
  remaining_stock?: number;
  available_from?: string;
  available_until?: string;
  created_by_user_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MarketRecommendations {
  id: string;
  user_id: string;
  item_id: string;
  score: number;
  reason?: string;
  computed_at: string;
}

export interface MarketTransactions {
  id: string;
  user_id: string;
  transaction_type: string;
  coins_amount: number;
  item_id?: string;
  reason?: string;
  created_at: string;
}

export interface OauthStates {
  id: string;
  state: string;
  provider: string;
  redirect_uri?: string;
  created_at: string;
  expires_at: string;
}

export interface OnboardingFlows {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingSteps {
  id: string;
  flow_id: string;
  step_order: number;
  step_type: string;
  title: string;
  description?: string;
  target_selector?: string;
  target_route?: string;
  fallback_content?: string;
  options?: Record<string, unknown>;
  allows_multiple: boolean;
  required: boolean;
  action_type?: string;
  action_config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PersonalRecords {
  id: string;
  user_id: string;
  exercise_id: string;
  record_type: string;
  value: number;
  reps?: number;
  achieved_at: string;
  exercise_set_id?: string;
  previous_value?: number;
  created_at: string;
}

export interface PlanTemplates {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  items: Record<string, unknown>;
  is_public: boolean;
  category?: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface PointsLedger {
  id: string;
  user_id: string;
  event_type: string;
  event_id?: string;
  coins: number;
  xp: number;
  skill_stars?: number;
  skill_key?: string;
  reason?: string;
  idempotency_key?: string;
  created_at: string;
}

export interface ProgramWeeks {
  id: string;
  program_id: string;
  week_number: number;
  name?: string;
  is_deload: boolean;
  notes?: string;
}

export interface ProgramWorkouts {
  id: string;
  program_week_id: string;
  workout_id: string;
  day_of_week: number;
  order_index: number;
  intensity_modifier: number;
}

export interface ReadingSessions {
  id: string;
  book_id: string;
  user_id: string;
  pages_read: number;
  start_page?: number;
  end_page?: number;
  duration_minutes?: number;
  started_at: string;
  notes?: string;
  xp_awarded: number;
  coins_awarded: number;
}

export interface ReferenceTracks {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  r2_key: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds?: number;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  key_signature?: string;
  tags?: string[];
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleEntitlements {
  role_id: string;
  entitlement_id: string;
  created_at: string;
}

export interface Roles {
  id: string;
  name: string;
  description?: string;
  parent_role_id?: string;
  created_at: string;
}

export interface Sessions {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_activity_at?: string;
  user_agent?: string;
  ip_address?: string;
  rotated_from?: string;
}

export interface SkillDefinitions {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  max_level: number;
  stars_per_level: number;
  sort_order: number;
  created_at: string;
}

export interface TrackAnalyses {
  id: string;
  track_id: string;
  analysis_type: string;
  version: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  summary?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrackAnnotations {
  id: string;
  track_id: string;
  user_id: string;
  start_time_ms: number;
  end_time_ms?: number;
  title: string;
  content?: string;
  category?: string;
  color?: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackRegions {
  id: string;
  track_id: string;
  user_id: string;
  start_time_ms: number;
  end_time_ms: number;
  name: string;
  description?: string;
  section_type?: string;
  color?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingPrograms {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  duration_weeks: number;
  goal?: string;
  difficulty?: string;
  is_active: boolean;
  current_week: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UniversalQuests {
  id: string;
  title: string;
  description?: string;
  type: string;
  xp_reward: number;
  coin_reward: number;
  target: number;
  target_type: string;
  target_config?: Record<string, unknown>;
  skill_key?: string;
  is_active: boolean;
  created_by?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserAchievements {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
  notified: boolean;
}

export interface UserDrillStats {
  id: string;
  user_id: string;
  drill_id: string;
  total_attempts: number;
  correct_answers: number;
  best_score: number;
  average_score: number;
  current_streak: number;
  best_streak: number;
  last_attempt_at?: string;
  total_time_seconds: number;
}

export interface UserInterests {
  id: string;
  user_id: string;
  interest_key: string;
  interest_label: string;
  created_at: string;
}

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  quiz_score?: number;
  attempts: number;
}

export interface UserOnboardingResponses {
  id: string;
  user_id: string;
  step_id: string;
  response: Record<string, unknown>;
  created_at: string;
}

export interface UserOnboardingState {
  id: string;
  user_id: string;
  flow_id: string;
  current_step_id?: string;
  status: string;
  can_resume: boolean;
  started_at?: string;
  completed_at?: string;
  skipped_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  total_skill_stars: number;
  created_at: string;
  updated_at: string;
}

export interface UserPurchases {
  id: string;
  user_id: string;
  item_id: string;
  cost_coins: number;
  quantity: number;
  purchased_at: string;
  redeemed_at?: string;
  uses_remaining?: number;
  status: string;
  refunded_at?: string;
  refund_reason?: string;
}

export interface UserQuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  status: string;
  progress: number;
  accepted_at: string;
  completed_at?: string;
  claimed_at?: string;
  last_reset_at?: string;
  times_completed: number;
  created_at: string;
  updated_at: string;
}

export interface UserQuests {
  id: string;
  user_id: string;
  source_quest_id?: string;
  title: string;
  description?: string;
  category?: string;
  difficulty: string;
  xp_reward: number;
  coin_reward: number;
  status: string;
  progress: number;
  target: number;
  is_active: boolean;
  is_repeatable: boolean;
  repeat_frequency?: string;
  accepted_at: string;
  completed_at?: string;
  claimed_at?: string;
  expires_at?: string;
  last_completed_date?: string;
  streak_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserReferences {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  url?: string;
  category?: string;
  tags?: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRewards {
  id: string;
  user_id: string;
  reward_type: string;
  source_id?: string;
  coins_earned: number;
  xp_earned: number;
  claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface UserRoles {
  user_id: string;
  role_id: string;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserSkills {
  id: string;
  user_id: string;
  skill_key: string;
  current_stars: number;
  current_level: number;
  total_stars: number;
  created_at: string;
  updated_at: string;
}

export interface UserStreaks {
  id: string;
  user_id: string;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  coins: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Users {
  id: string;
  name?: string;
  email: string;
  email_verified?: string;
  image?: string;
  role: string;
  approved: boolean;
  age_verified: boolean;
  tos_accepted: boolean;
  tos_accepted_at?: string;
  tos_version?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationTokens {
  identifier: string;
  token: string;
  expires: string;
  created_at: string;
}

export interface WorkoutExercises {
  id: string;
  workout_id: string;
  section_id?: string;
  exercise_id: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  rest_seconds?: number;
  notes?: string;
  sort_order: number;
}

export interface WorkoutSections {
  id: string;
  workout_id: string;
  name: string;
  section_type?: string;
  sort_order: number;
}

export interface WorkoutSessions {
  id: string;
  user_id: string;
  workout_id?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  notes?: string;
  rating?: number;
  xp_awarded: number;
  coins_awarded: number;
}

export interface Workouts {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  estimated_duration?: number;
  difficulty?: string;
  category?: string;
  is_template: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
