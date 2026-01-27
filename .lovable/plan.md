
# Holistic Scrolling Fix Plan

## Problem Summary

The application has a **nested scroll container conflict** caused by inconsistent layout patterns. This prevents users from scrolling on many pages. The root cause is an architectural pattern problem where:

1. **Layout components** (AdminLayout, DashboardLayout) create fixed-height viewports with `h-screen` and internal scroll areas via `overflow-auto`
2. **Individual pages** then add their own `min-h-screen overflow-y-auto` containers, creating conflicting scroll behaviors
3. **Centralized PageLayout components** were created but never adopted, so the underlying issue persists

## Solution Overview

This plan establishes a **single source of truth** for scrolling behavior and migrates all pages to use standardized layout components, preventing this issue from recurring.

## Implementation Phases

### Phase 1: Global CSS Foundation

Update `src/index.css` to ensure the base document allows natural overflow:

- Confirm `html`, `body`, and `#root` use `min-height: 100%` (not `height: 100%`)
- Add `overflow-y: auto` to body to allow natural document scrolling
- Remove any conflicting legacy styles

### Phase 2: Layout Components (The Control Layer)

Update the two main layout wrappers to properly handle scrolling. These are the **only** components that should define scroll containers.

**Files to update:**
- `src/pages/AdminLayout.tsx` - Uses `FullPageLayout` pattern
- `src/pages/DashboardLayout.tsx` - Uses `FullPageLayout` pattern

**Changes:**
- Ensure `main` element has `flex-1 overflow-auto` (scroll happens here)
- Remove any remaining `overflow-hidden` classes
- Add `min-h-0` to flex children to prevent overflow issues in flexbox

### Phase 3: Page Component Migration (Approx. 50+ files)

Remove all conflicting scroll classes from individual pages. Pages should be **content-only** and not define their own scroll containers.

**Pattern to remove from pages:**
```text
<!-- WRONG - causes nested scroll conflict -->
<div className="min-h-screen overflow-y-auto ...">
```

**Pattern to use instead:**
```text
<!-- CORRECT - uses flex-1 to fill available space -->
<div className="flex-1 overflow-auto">
  <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
```

**Pages requiring updates (grouped by layout):**

**Inside AdminLayout:**
- Settings.tsx - Remove `min-h-screen overflow-y-auto`
- UserManagement.tsx
- StaffManagement.tsx
- BackupManagement.tsx
- FeedbackManagement.tsx
- FeedbackAnalytics.tsx
- GamificationAdmin.tsx
- PRDManager.tsx
- Finance.tsx
- Invoicing.tsx

**Inside DashboardLayout:**
- Dashboard.tsx (already correct pattern)
- TenantTracker.tsx
- CostReports.tsx (already correct pattern)
- CostReportDetail.tsx
- ElectricalBudgets.tsx
- ElectricalBudgetDetail.tsx
- Specifications.tsx
- SpecificationDetail.tsx
- CableSchedules.tsx
- CableScheduleDetail.tsx
- FinalAccounts.tsx
- FinalAccountDetail.tsx
- BOQs.tsx, BOQDetail.tsx, BOQProjectDetail.tsx
- FloorPlan.tsx
- Messages.tsx
- SiteDiary.tsx
- AITools.tsx, AISkills.tsx
- ProjectOutline.tsx
- GeneratorReport.tsx, LightingReport.tsx
- HandoverDocuments.tsx
- BulkServices.tsx
- MasterLibrary.tsx
- DashboardContactLibrary.tsx
- ProjectRoadmap.tsx, RoadmapReviewMode.tsx
- DrawingRegister.tsx
- ProjectSettings.tsx

**Standalone Pages (no parent layout):**
- Index.tsx - Can keep `min-h-screen` but remove `overflow-hidden`
- ProjectSelect.tsx - Update to use proper scrolling
- ClientPortal.tsx - Uses `min-h-screen`, should scroll naturally
- ContractorPortal.tsx - Uses `min-h-screen`, should scroll naturally
- HandoverClient.tsx, HandoverClientManagement.tsx
- ExternalRoadmapReview.tsx
- ContractorReviewPortal.tsx
- ClientGeneratorReportView.tsx
- Auth.tsx, SetPassword.tsx

### Phase 4: Adopt PageLayout Component

For pages with standard content patterns (title, description, actions, content), adopt the `PageLayout` component:

```text
import { PageLayout } from "@/components/layout";

// Usage
<PageLayout
  title="Cost Reports"
  description="Manage project cost reports"
  headerActions={<Button>New Report</Button>}
>
  {/* Page content */}
</PageLayout>
```

This provides:
- Consistent spacing (px-6, py-6, max-w-[1600px])
- Proper overflow handling (flex-1 overflow-auto)
- Standardized header layout

### Phase 5: Documentation and Prevention

Create a development guide to prevent regression:

1. **Add JSDoc comments** to PageLayout components explaining the scrolling architecture
2. **Update the existing memory** (`ui-ux/global-scrolling-standard`) with adoption requirements
3. **Establish a convention**:
   - Layouts own scroll containers
   - Pages are content-only
   - Use `PageLayout` for standard pages
   - Never use `min-h-screen overflow-y-auto` inside a layout

## Technical Details

### The Correct Scroll Architecture

```text
+--------------------------------------------------+
| html (min-height: 100%)                          |
|  +----------------------------------------------+|
|  | body (min-height: 100%)                      ||
|  |  +------------------------------------------+||
|  |  | #root (min-height: 100%)                 |||
|  |  |  +--------------------------------------+|||
|  |  |  | Layout (h-screen flex)               ||||
|  |  |  |  +----------------------------------+||||
|  |  |  |  | Sidebar (fixed width)            |||||
|  |  |  |  +----------------------------------+||||
|  |  |  |  +----------------------------------+||||
|  |  |  |  | Content Column (flex-1 flex-col) |||||
|  |  |  |  |  +------------------------------+|||||
|  |  |  |  |  | Header (shrink-0)            ||||||
|  |  |  |  |  +------------------------------+|||||
|  |  |  |  |  +------------------------------+|||||
|  |  |  |  |  | main (flex-1 overflow-auto)  ||||||  <-- ONLY SCROLL HERE
|  |  |  |  |  |   Page content renders here  ||||||
|  |  |  |  |  +------------------------------+|||||
|  |  |  |  +----------------------------------+||||
|  |  |  +--------------------------------------+|||
|  |  +------------------------------------------+||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `h-screen` | Fixed viewport height (layout root only) |
| `flex-1` | Fills remaining space |
| `min-h-0` | Prevents flex overflow issues |
| `overflow-auto` | Enables scrolling (layout main only) |
| `shrink-0` | Prevents header from shrinking |

### What NOT to Use in Pages

| Bad Pattern | Why It's Wrong |
|-------------|----------------|
| `min-h-screen` | Creates min-height larger than parent flex container |
| `overflow-y-auto` | Creates nested scroll container |
| `overflow-hidden` | Blocks all scrolling |
| `h-screen` | Fixed height conflicts with flex parent |

## Rollout Priority

1. **Immediate (Phase 1-2)**: Fix global CSS and layout components - this unblocks all pages
2. **High Priority (Phase 3)**: Fix Settings.tsx and other frequently-used pages
3. **Standard (Phase 3 continued)**: Migrate remaining pages systematically
4. **Optional (Phase 4)**: Adopt PageLayout component for cleaner code

## Success Criteria

After implementation:
- All pages scroll vertically when content exceeds viewport
- No double scrollbars appear
- Scroll position is preserved during navigation
- Sidebar remains fixed while content scrolls
- Mobile and desktop both work correctly

## Estimated Scope

- **Files to modify**: ~55 page files + 2 layout files + 1 CSS file
- **New code**: Minimal - mostly removing classes
- **Risk**: Low - changes are additive/subtractive, not structural
