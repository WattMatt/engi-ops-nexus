

## Plan: Scorched Earth Planner Reset

### What needs to change

The current `planner-reset` function already deletes tasks within plans, but it cannot **delete the plans themselves**. You want a true scorched-earth approach:

1. **Delete all existing plans** in the M365 Group first
2. **Recreate plans from scratch** for every Nexus project that has roadmap items
3. **Populate them** with all roadmap items (the existing logic)

### Technical approach

Modify `supabase/functions/planner-reset/index.ts` to add a `scorchedEarth` mode (triggered by a body param `{ "scorchedEarth": true }`):

**New Phase 0 — Delete all plans:**
- Fetch all plans from `GET /groups/{GROUP_ID}/planner/plans`
- For each plan, delete all its tasks first (Planner API requires plans to be empty before deletion)
- Then delete each plan via `DELETE /planner/plans/{planId}` with its etag
- Clear all `planner://task/` link URLs from `project_roadmap_items` in the database (since all task IDs become invalid)
- Add throttling (200-300ms) between deletions to avoid Graph rate limits

**Then the existing logic runs:**
- The plan list will be empty, so auto-create kicks in for every project with roadmap items
- Buckets get created per phase
- Tasks get created and linked back

### Changes

**1 file modified:** `supabase/functions/planner-reset/index.ts`
- Add `scorchedEarth` param parsing from request body
- Add Phase 0: iterate all plans → delete tasks → delete plan → clear DB links
- Rest of function runs as-is (auto-create + populate)

### Risk mitigation
- Only triggered when explicitly passing `{ "scorchedEarth": true }` — normal reset still works as before
- Batch limits still apply via `maxPlansToCreate` to avoid timeout
- All planner link URLs cleared from DB to prevent stale references

