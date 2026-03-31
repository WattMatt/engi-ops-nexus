

# Fix: Bidirectional Planner Sync (Completions Not Sticking)

## Problem Analysis

Two confirmed bugs in the Planner ↔ Nexus sync:

**Bug 1 — Planner completions pop back to incomplete:**
- When you complete a task in Planner, the on-demand `planner-push` (triggered by any UI edit in Nexus) checks `percentComplete === 100`. However, Planner uses intermediate states (`50` = "In Progress") and the check only matches exact `100`. If `planner-push` fires while Planner is at 50% (or any non-100 value), it writes `percentComplete: 0` back, undoing the completion.

**Bug 2 — Nexus completions don't clear items in Planner:**
- The on-demand `planner-push` should push `percentComplete: 100` when Nexus marks an item complete. However, `planner-reset` (runs every 3 minutes) skips ALL linked tasks with `continue` — it never pushes Nexus completion status to Planner. If the one-shot `planner-push` fails (network, etag conflict), there is no retry, and the Planner task stays open forever.

## Plan

### 1. Fix `planner-push` — Respect any non-zero Planner completion
**File:** `supabase/functions/planner-push/index.ts`

- Change the Planner-authoritative check from `percentComplete === 100` to `percentComplete > 0`. If Planner shows any progress (50 = in progress, 100 = done), never reset it to 0.
- Only push `percentComplete: 0` if BOTH Planner is at 0% AND Nexus is not completed.
- When Nexus IS completed, always push `percentComplete: 100` regardless of Planner state.

### 2. Fix `planner-reset` — Push Nexus completions for linked tasks
**File:** `supabase/functions/planner-reset/index.ts`

- For linked tasks that are currently skipped: if the Nexus item is `is_completed = true` but the Planner task is NOT at 100%, PATCH the Planner task to `percentComplete: 100`. This acts as a retry mechanism for failed on-demand pushes.
- Keep the existing logic that adopts Planner completions into Nexus.
- Only truly skip linked tasks where both sides agree on the completion state.

### 3. Fix `planner-sync` — Push Nexus completions during pull
**File:** `supabase/functions/planner-sync/index.ts`

- During the hourly pull, if a Nexus item is `is_completed = true` but the matched Planner task has `percentComplete !== 100`, PATCH the Planner task to complete. This ensures Nexus completions eventually reach Planner even if both push mechanisms failed.

## Technical Details

### `planner-push` completion logic (revised):
```typescript
const plannerPercent = taskData.percentComplete;
const nexusIsComplete = item.is_completed === true;

// Nexus says complete → always push 100 to Planner
// Planner says complete (100) but Nexus doesn't → adopt into Nexus, push 100
// Planner is in-progress (>0 but <100) and Nexus not complete → leave Planner alone, don't reset
// Both at 0/false → push 0
let effectivePercent: number;
if (nexusIsComplete) {
  effectivePercent = 100;
} else if (plannerPercent >= 50) {
  // Planner is at least in-progress — adopt completion into Nexus
  effectivePercent = plannerPercent;
  if (plannerPercent === 100) {
    // Adopt full completion
    await supabase.from('project_roadmap_items').update({...}).eq('id', roadmapItemId);
  }
} else {
  effectivePercent = 0;
}
```

### `planner-reset` linked task handling (revised):
```typescript
if (hasLink) {
  const plannerTaskId = item.link_url.replace('planner://task/', '');
  const taskData = planTaskById[plannerTaskId];
  if (!taskData) { /* recreate */ }
  else {
    // Adopt Planner completion → Nexus (existing logic)
    if (taskData.percentComplete === 100 && !item.is_completed) { ... }
    
    // NEW: Push Nexus completion → Planner
    if (item.is_completed && taskData.percentComplete !== 100) {
      await graphPatch(token, `.../tasks/${plannerTaskId}`,
        { percentComplete: 100 }, taskData['@odata.etag']);
      log(`  ✅ Pushed completion to Planner: "${item.title}"`);
    }
    continue;
  }
}
```

### `planner-sync` reverse-push during pull (new):
Add a `graphPatch` helper and after updating the Nexus item, if `existing.is_completed === true && task.percentComplete !== 100`, patch the Planner task to 100%.

