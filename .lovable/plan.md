
# Convert Project Settings Tabs to Vertical Sidebar Layout

## Problem
The 7 horizontal tabs on the Project Settings page wrap onto two rows, making the navigation look cluttered and hard to scan.

## Solution
Convert the tab navigation from a horizontal bar to a vertical sidebar layout on desktop, while keeping it horizontal (scrollable) on mobile.

## Layout Structure

```text
+---------------------------+-------------------------------+
| Project Settings          |                               |
| (vertical tab list)       |   Tab Content Area            |
|                           |                               |
| [x] Project Settings      |   (selected tab's content)    |
| [ ] Project Contacts      |                               |
| [ ] Contacts Library       |                               |
| [ ] Team Members          |                               |
| [ ] Client Portal         |                               |
| [ ] Contractor Portal     |                               |
| [ ] Report Automation     |                               |
+---------------------------+-------------------------------+
```

On mobile (below `md` breakpoint), tabs revert to a horizontal scrollable strip above the content.

## Technical Details

### File: `src/pages/ProjectSettings.tsx`

1. Change the `Tabs` component to use `orientation="vertical"` on desktop
2. Replace `space-y-6` with a flex row layout: `flex flex-col md:flex-row md:gap-6`
3. Style the `TabsList` as a vertical sidebar:
   - `md:flex-col md:w-56 md:shrink-0` for vertical stacking on desktop
   - Keep horizontal scroll wrapper for mobile
   - Left-align text with `md:justify-start` on each trigger
4. Give the content area `flex-1 min-w-0` so it fills remaining space

### File: `src/pages/Settings.tsx`

Apply the same vertical sidebar pattern for consistency, since it also has 11 tabs for admin users that wrap badly.

### No new dependencies or database changes required.
