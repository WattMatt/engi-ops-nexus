
# Roadmap ↔ Site Diary Integration Plan

## Overview
Create a bi-directional connection between the Project Roadmap and Site Diary Tasks, enabling teams to link operational field tasks to strategic roadmap milestones.

## Current State
- **Roadmap**: High-level project milestones organized by phases (Planning, Design, Construction, etc.)
- **Site Diary Tasks**: Day-to-day operational tasks with Kanban boards, calendars, and progress tracking
- **No connection exists** between these two systems

## Proposed Integration Features

### 1. Database Schema Changes
Add a foreign key relationship to link tasks to roadmap items:

```text
site_diary_tasks table
├── roadmap_item_id (NEW) → references project_roadmap_items(id)
```

### 2. Task Creation/Edit Enhancement
When creating or editing a site diary task, users can optionally:
- **Link to Roadmap Item**: Select from a searchable dropdown of roadmap items
- View the linked roadmap item's phase, due date, and priority for context

### 3. Roadmap Item View Enhancement
On the roadmap side, add ability to:
- **View Linked Tasks**: See all site diary tasks linked to a specific roadmap item
- **Quick Task Stats**: Display task completion metrics (e.g., "4/7 tasks completed")
- **Create Task from Roadmap**: Quick action to create a new site diary task pre-linked to that milestone

### 4. Sync Task Completion to Roadmap
Optional automated behavior:
- When **all linked tasks** for a roadmap item are completed, prompt to mark the roadmap item as complete
- Show visual progress indicator on roadmap items based on linked task completion

### 5. New "Sync to Roadmap" Action for Tasks
Similar to how drawings sync works:
- Bulk select multiple site diary tasks
- Sync them as child items under a selected roadmap milestone
- Creates tracking visibility at the roadmap level

---

## Technical Details

### Database Migration
```sql
-- Add roadmap_item_id to site_diary_tasks
ALTER TABLE site_diary_tasks
ADD COLUMN roadmap_item_id UUID REFERENCES project_roadmap_items(id) ON DELETE SET NULL;

-- Index for performance on linked task queries
CREATE INDEX idx_site_diary_tasks_roadmap_item 
ON site_diary_tasks(roadmap_item_id) WHERE roadmap_item_id IS NOT NULL;
```

### New Components

| Component | Purpose |
|-----------|---------|
| `RoadmapItemSelector.tsx` | Searchable dropdown for selecting roadmap items in task dialogs |
| `LinkedTasksBadge.tsx` | Badge showing linked task count on roadmap items |
| `LinkedTasksPanel.tsx` | Expandable panel showing all tasks linked to a roadmap item |
| `SyncTasksToRoadmapDialog.tsx` | Bulk sync multiple tasks to a roadmap milestone |

### Modified Components

| Component | Changes |
|-----------|---------|
| `EnhancedTasksManager.tsx` | Add roadmap item selector to task creation form |
| `TaskDetailsModal.tsx` | Show linked roadmap item info, allow editing the link |
| `RoadmapItem.tsx` | Display linked task count and progress indicator |
| `TableView.tsx` / `KanbanBoard.tsx` | Show roadmap link indicator on task cards |

### Data Flow

```text
                    ┌─────────────────────────┐
                    │   Project Roadmap       │
                    │   (Strategic View)      │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
     ┌────────────┐    ┌────────────┐    ┌────────────┐
     │ Phase 1    │    │ Phase 2    │    │ Phase 3    │
     │ Milestone  │    │ Milestone  │    │ Milestone  │
     └─────┬──────┘    └─────┬──────┘    └────────────┘
           │                 │
     ┌─────┼─────┐     ┌─────┼─────┐
     ▼           ▼     ▼           ▼
  ┌──────┐   ┌──────┐ ┌──────┐   ┌──────┐
  │Task 1│   │Task 2│ │Task 3│   │Task 4│
  │ ✓    │   │ ○    │ │ ○    │   │ ✓    │
  └──────┘   └──────┘ └──────┘   └──────┘
        Site Diary Tasks (Operational)
```

---

## Implementation Phases

### Phase 1: Database & Basic Linking
1. Create migration for `roadmap_item_id` column
2. Build `RoadmapItemSelector` component
3. Update task creation/edit forms to include roadmap linking

### Phase 2: Roadmap View Integration
1. Add linked tasks count to roadmap items
2. Create `LinkedTasksPanel` for viewing associated tasks
3. Add "Create Task" action from roadmap items

### Phase 3: Bulk Sync & Progress Tracking
1. Build `SyncTasksToRoadmapDialog` for bulk operations
2. Implement progress indicator on roadmap items
3. Optional: Auto-complete suggestion when all tasks done

---

## User Experience Benefits

1. **Strategic Alignment**: Field teams see how their daily work connects to project milestones
2. **Progress Visibility**: Project managers view task-level progress from the roadmap
3. **Traceability**: Clear audit trail from high-level planning to ground-level execution
4. **Reduced Duplication**: No need to manually track the same work in two places

---

## Additional Improvement Prompts
After implementation, consider:
- Add filters to site diary views to show "Tasks by Roadmap Phase"
- Create a combined timeline view showing both roadmap milestones and linked tasks
- Export linked tasks with their roadmap context in reports
- Add roadmap-based task grouping to the Gantt chart view
