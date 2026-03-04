

# Planner Bidirectional Sync — Consolidated Fix Plan

## The Problem

The current system has drifted into an inconsistent state through incremental patches. Three specific failures:

1. **Duplicate tasks in KINGSWALK**: The reset function created new Planner tasks without checking if tasks already existed, then the cleanup deleted the originals instead of the duplicates.
2. **Inbox not pulling to Nexus**: `planner-sync` (the hourly pull) correctly creates new Nexus items for unrecognized Planner tasks, but the `planner-reset` cleanup pass then deletes those same Planner tasks as "orphans" because they haven't been linked yet.
3. **Phase/bucket drift**: Tasks get overwritten between the two functions fighting over source-of-truth.

The root cause is that the three functions (`planner-sync`, `planner-reset`, `planner-push`) have overlapping responsibilities with conflicting logic.

---

## The Fix — Consolidate into Clear Responsibilities

### Function 1: `planner-sync` (Planner → Nexus, hourly cron)
**Purpose**: Pull changes FROM Planner INTO Nexus. This is the ONLY function that reads Planner state.

Changes needed:
- Keep existing logic that matches Planner tasks to Nexus items by `link_url` or title
- Keep existing logic that creates NEW Nexus items (phase = bucket name, defaults to "Inbox") for unrecognized Planner tasks
- **Add**: When updating existing items, only update fields that Planner owns (completion status, assignees) — do NOT overwrite `phase` if the Nexus item already has one set differently (Nexus is source of truth for phase)
- **Add**: Detect tasks deleted from Planner and mark the Nexus item accordingly (clear `link_url`)

### Function 2: `planner-reset` (Nexus → Planner, on-demand)
**Purpose**: Push Nexus state TO Planner. One-way push only.

Changes needed:
- **Remove** the orphan cleanup logic entirely — it conflicts with sync
- **Remove** the "skip if fully synced" shortcut that tries to also move buckets (that's doing sync's job)
- Simplify to: for each Nexus item without a `link_url`, create the Planner task in the correct bucket and save the link. For items WITH a `link_url`, PATCH the existing Planner task (title, bucket, priority, completion, assignees, dates)
- Always ensure all 7 template buckets + Inbox exist

### Function 3: `planner-push` (Nexus → Planner, per-item)
**Purpose**: Real-time push of a single item change. No changes needed — already works correctly.

---

## Implementation Steps

1. **Rewrite `planner-reset`** (~200 lines simpler):
   - Remove scorched earth, orphan cleanup, and bucket reassignment from the "skip" path
   - Single loop: ensure buckets → for each item, create-or-update Planner task → save link
   - Items with existing `link_url`: PATCH task (move bucket if phase changed, update fields)
   - Items without `link_url`: POST new task, save link

2. **Update `planner-sync`** (minor changes):
   - Do NOT overwrite `phase` on existing Nexus items that already have a non-Inbox phase
   - New Planner tasks get pulled as `phase: 'Inbox'` (correct current behavior)
   - Add logging to confirm new-item creation

3. **Run a one-time data audit**:
   - Query KINGSWALK to check for any remaining duplicates in Nexus DB
   - Verify link_url integrity across all projects
   - Trigger a clean `planner-reset` for KINGSWALK specifically

4. **Verify end-to-end**:
   - Create a test task directly in Planner → confirm it appears in Nexus Inbox after cron
   - Move a Nexus item to a different phase → trigger reset → confirm bucket changes in Planner
   - Complete a task in Planner → confirm completion syncs to Nexus

---

## Technical Detail

The key data contract between the two functions:

```text
planner-sync (pull):
  Planner task exists, Nexus item exists (matched by link_url) → UPDATE nexus (completion, assignees only)
  Planner task exists, no Nexus match → INSERT nexus item (phase = bucket name or "Inbox")

planner-reset (push):
  Nexus item has link_url → PATCH planner task (all fields including bucket)
  Nexus item has no link_url → POST new planner task, save link_url
```

No function deletes Planner tasks. No function overwrites Nexus phases from Planner if already set.

