# Exercise & Workouts

Track your fitness journey with the comprehensive exercise system.

## Overview

The Exercise tab provides:
- **Exercise Library** - Database of exercises
- **My Workouts** - Custom workout templates
- **History** - Past workout sessions
- **Personal Records** - Your best lifts

## Exercise Library

Browse exercises by:
- **Category** - Strength, Cardio, Stretching, etc.
- **Muscle Group** - Chest, Back, Legs, etc.
- **Equipment** - Barbell, Dumbbell, Bodyweight, etc.

### Adding Custom Exercises

1. Click "Add Exercise"
2. Fill in details:
   - Name
   - Category
   - Muscle groups
   - Equipment needed
   - Instructions
3. Click "Create"

## Creating Workouts

Build workout templates for repeated use:

1. Click "Create Workout"
2. Name your workout
3. Add exercises:
   - Search the library
   - Click to add
   - Set target sets/reps
   - Set rest time
4. Organize with **sections**:
   - Warmup
   - Main workout
   - Cooldown
   - Supersets/circuits
5. Save the workout

### Workout Sections

Organize exercises into named sections:
- **Warmup** - Light exercises to prepare
- **Main** - Primary workout content
- **Cooldown** - Stretching and recovery
- **Superset** - Exercises performed back-to-back
- **Circuit** - Multiple exercises in sequence

## Starting a Workout

### Quick Start
Click "Start Workout" to log exercises without a template.

### From Template
1. Go to "My Workouts"
2. Click a workout
3. Click "Start"

## Logging Sets

During a workout:
1. Select an exercise
2. Enter weight and reps
3. Optionally add RPE (Rate of Perceived Exertion, 1-10)
4. Click "Log Set"
5. Repeat for each set

### Personal Records

The system automatically tracks PRs:
- **1RM** - One rep max (calculated)
- **Best Weight** - Heaviest weight for any rep range
- **Best Volume** - Weight x Reps in a set

When you hit a PR, you'll see a notification!

## Completing Workouts

1. Click "Complete Workout"
2. Rate your session (optional)
3. Add notes (optional)
4. Earn XP and coins

Rewards:
- **50 XP** per completed workout
- **25 coins** per completed workout
- Progress toward exercise quests

## Linking to Planner

Schedule workouts on your calendar:
1. Click the calendar icon on a workout
2. Choose date and time
3. Set recurrence (optional):
   - One time
   - Daily
   - Mon/Wed/Fri
   - Tue/Thu/Sat
   - Weekly
4. Click "Schedule"

## Linking to Quests

Create a quest from a workout:
1. Click the quest icon on a workout
2. Choose if it's repeatable
3. Set frequency (daily/weekly)
4. Quest is created automatically

## Import Format

Import exercises in JSON format:
```json
[
  {
    "name": "Bench Press",
    "category": "strength",
    "muscle_groups": ["chest", "triceps", "shoulders"],
    "equipment": ["barbell", "bench"],
    "instructions": "Lie on bench, lower bar to chest, press up"
  }
]
```

---

Next: [Training Programs](./programs.md)

