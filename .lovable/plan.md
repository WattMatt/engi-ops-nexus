
# Project Roadmap System — Complete Technical Documentation

## What This Document Covers
A comprehensive reference for every button, process, database table, edge function, email trigger, and integration that powers the Project Roadmap tab at `/dashboard/roadmap`.

## Plan

### 1. Generate the document
Write a detailed Markdown document to `/mnt/documents/` covering all aspects of the roadmap system:

**A. UI Components & Buttons**
- Page layout (`ProjectRoadmap.tsx`): header buttons (Review Mode, Bulk Assign, Analytics toggle, Export PDF)
- `ProjectRoadmapWidget`: the main card with progress bar, phase grouping, drag-and-drop (dnd-kit), "Load Baseline Roadmap" template, minimize/expand, completion streak badge
- `RoadmapItem`: checkbox completion, priority badges, due date badges (overdue/due-today), inline date pickers, discussion thread button, linked tasks badge, context menu (Edit, Add Sub-item, View Linked Tasks, Notify Team, Delete), drag handle
- `AddRoadmapItemDialog`: create/edit form with title, description, phase (7 standard phases + General), priority (low/medium/high/critical), due date, link URL/label, comments, team member assignment, synced assignees display
- `BulkAssignDialog`: multi-select items by phase, assign to team member, optional email notification
- `RoadmapProgressChart`: analytics panel with 4 summary cards (progress %, completed, pending, overdue), completion pie chart, phase progress stacked bar chart
- `RoadmapExportPDFButton`: configurable PDF export (cover page, meeting header, completed/pending items, action items) using the SVG-to-PDF engine
- `ReviewModeButton`: navigates to `/dashboard/roadmap-review` for structured review sessions
- `ReviewCompletionDialog`: sends review update emails to selected recipients (team members, contacts, custom emails)
- `RoadmapItemDiscussion`: real-time comment thread per item with add/edit/delete, realtime subscription on `roadmap_item_comments`
- `LinkedTasksBadge` / `LinkedTasksPanel`: shows site diary tasks linked via `roadmap_item_id`, progress bar, unlink capability
- `CompletionStreakBadge`: gamification showing current/longest streak and total completions
- `RoadmapCompletionPrompt`: auto-prompts when all linked site diary tasks complete — offers to mark roadmap item complete with confetti

**B. Database Tables**
- `project_roadmap_items`: core table — id, project_id, title, description, phase, parent_id, sort_order, is_completed, completed_at, completed_by, link_url, link_label, comments, start_date, due_date, priority, assigned_to, assignee_ids (jsonb), created_at, updated_at
- `roadmap_item_comments`: discussion threads — roadmap_item_id, user_id, content, created_at, updated_at. Realtime enabled.
- `roadmap_completion_streaks`: gamification — user_id, project_id, current_streak, longest_streak, last_completion_date, total_completions
- `notification_queue`: scheduled due-date reminders — notification_type, roadmap_item_id, project_id, recipient_user_id, recipient_email, scheduled_for, metadata
- `planner_sync_log`: sync audit trail
- `azure_ad_user_mapping`: Planner assignee resolution
- `site_diary_tasks.roadmap_item_id`: FK linking tasks to roadmap items

**C. Database Functions & Triggers**
- `update_roadmap_completion_streak()`: trigger on `project_roadmap_items` — auto-updates streak when `is_completed` flips to true
- `update_completion_streak(p_user_id, p_project_id)`: RPC called from client after completion — returns streak data + `is_new_record` flag
- `queue_roadmap_due_notifications(days_ahead)`: scheduled RPC — finds items due in N days, inserts into `notification_queue` for all project members

**D. Edge Functions (Emails)**
- `send-roadmap-completion-notification`: triggered on item completion (from UI or Planner sync) — emails all project members via Resend API
- `send-roadmap-assignment-notification`: triggered by bulk assign — emails assigned user with item list
- `send-roadmap-due-date-notification`: triggered manually via "Notify Team" context menu — emails project members about upcoming due date
- `send-roadmap-comment-notification`: triggered on new comment — emails via Gmail SMTP
- `send-roadmap-share-invitation`: sends review share links to external stakeholders
- `send-roadmap-review-update`: sends review session summary to selected recipients
- `send-weekly-streak-summary`: scheduled — emails weekly streak leaderboard via Resend
- `process-roadmap-notifications`: processes the `notification_queue` — handles due-date reminder emails with templates

**E. Microsoft Planner Integration**
- `planner-sync` (hourly cron): pulls tasks from Planner, matches to Nexus roadmap items, updates completion/assignees, reverse-pushes Nexus completions back to Planner
- `planner-reset` (every 3 minutes): creates Planner tasks for unlinked roadmap items, pushes Nexus completions to Planner for linked items
- `planner-push` (on-demand): triggered by UI edits — syncs individual item changes to Planner, respects Planner completion authority
- Client utility `src/utils/plannerPush.ts`: fire-and-forget invocation of `planner-push` after UI mutations

**F. Hooks**
- `useCompletionStreak`: fetches and updates streak data via `roadmap_completion_streaks` table and `update_completion_streak` RPC
- `useRoadmapComments`: fetches comments with realtime subscription, resolves author names from profiles
- `useRoadmapCompletionCheck`: checks if all linked site diary tasks are complete, triggers the completion prompt
- `useMilestoneNotifications`: calculates milestone progress for dashboard notifications

**G. Data Flow Diagrams**
- Completion flow: Checkbox click → DB update → email notification → Planner push → streak update → confetti
- Planner sync flow: Hourly pull → match by title/plan → update DB → trigger completion notification if newly complete → reverse-push if Nexus ahead
- Review flow: Enter review mode → toggle items → complete review → send summary email to recipients

### 2. Deliver as downloadable artifact
Output as a clean Markdown file at `/mnt/documents/Roadmap-System-Complete-Documentation.md`.
