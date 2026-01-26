

# Fix: Cable Summary in Floor Plan Overview

## Problem Summary
The **Cables tab** in the Overview panel shows "0 cables" despite having visual cables drawn on the canvas. This is because:

1. **Canvas lines** (drawn cables like "4Core x 4mm² AC") are stored in the `lines` array as `SupplyLine` objects
2. **The Cables tab** queries the `cable_entries` database table, which is separate from canvas lines
3. The Summary tab correctly shows cables using `<LvCableSummary lines={lines} />` which reads the canvas data

## Current Data Flow
```text
┌─────────────────────────────────────────────────────────────────┐
│                     FLOOR PLAN MARKUP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐          │
│  │   Canvas Lines       │     │   Database Entries    │          │
│  │   (SupplyLine[])     │     │   (cable_entries)     │          │
│  ├──────────────────────┤     ├──────────────────────┤          │
│  │ • Drawn visually     │     │ • Manual entries      │          │
│  │ • Stored in markup   │     │ • Cable schedule data │          │
│  │ • type: 'lv'         │     │ • Has costs/rates     │          │
│  │ • cableType set      │     │ • Linked to schedules │          │
│  └──────────┬───────────┘     └──────────┬───────────┘          │
│             │                            │                       │
│             ▼                            ▼                       │
│  ┌────────────────────┐      ┌─────────────────────┐            │
│  │   Summary Tab      │      │   Cables Tab        │            │
│  │   (LvCableSummary) │      │   (shows cableEntries)           │
│  │   ✓ WORKS          │      │   ✗ SHOWS 0         │            │
│  └────────────────────┘      └─────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Solution
Update the **Cables tab** to display **both** data sources:
1. **Visual Canvas Cables** - From the `lines` array (what user draws)
2. **Database Cable Entries** - From `cable_entries` table (formal schedule)

This provides a complete picture of all cables for the current layout.

---

## Technical Implementation

### File: `src/components/floor-plan/components/EquipmentPanel.tsx`

#### Change 1: Add Canvas Cable Summary to Cables Tab
Update the Cables tab rendering (lines 1601-1686) to include visual canvas cables:

**Before:**
```tsx
<div style={{ display: activeTab === 'cables' ? 'block' : 'none' }}>
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cable Schedule</h3>
    ...
  </div>
  {loadingCables ? (...) : cableEntries.length > 0 ? (
    // Only shows database entries
  ) : (
    <p>No cables in schedule for this project.</p>
  )}
</div>
```

**After:**
```tsx
<div style={{ display: activeTab === 'cables' ? 'block' : 'none' }}>
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cable Schedule</h3>
    ...
  </div>
  
  {/* Section 1: Visual Canvas Cables (from lines array) */}
  <LvCableSummary lines={lines} />
  
  {/* Section 2: Database Cable Entries (formal schedule) */}
  <div className="mt-4">
    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
      Database Cable Entries
    </h4>
    {loadingCables ? (...) : cableEntries.length > 0 ? (
      // Existing database entries display
    ) : (
      <p className="text-gray-500 text-xs text-center p-2">
        No formal cable entries linked to this layout.
      </p>
    )}
  </div>
</div>
```

#### Change 2: Compute Canvas Cable Metrics
Add a `useMemo` to calculate canvas cable totals for display:

```tsx
const canvasCableSummary = useMemo(() => {
  const lvLines = lines.filter(l => l.type === 'lv' && l.cableType);
  const { summary, totalLength } = calculateLvCableSummary(lvLines);
  return {
    count: lvLines.length,
    totalLength,
    byType: Array.from(summary.entries())
  };
}, [lines]);
```

#### Change 3: Update Empty State Message
When no cables exist from either source, show appropriate guidance:

```tsx
{canvasCableSummary.count === 0 && cableEntries.length === 0 && (
  <div className="text-center py-6">
    <Cable className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
    <p className="text-gray-500 text-xs">
      No cables on this layout.
    </p>
    <p className="text-gray-500 text-[10px] mt-1">
      Use the Conductor tool to draw LV cables, or link cables from the Cable Schedule module.
    </p>
  </div>
)}
```

---

## UI Structure After Fix

```text
┌─────────────────────────────────────────────────────┐
│                 CABLES TAB                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ CANVAS CABLES (from this layout)              │  │
│  ├───────────────────────────────────────────────┤  │
│  │ ● 4Core x 4mm² AC          105.63m           │  │
│  │ ● 32mm∅ Conduit            48.20m            │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ DATABASE CABLE ENTRIES                        │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Total: 5 cables | 342.50m | R 12,450.00      │  │
│  │ ─────────────────────────────────────────────│  │
│  │ [Cable entry cards from cable_entries table] │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│           [3D Analysis Button]                     │
└─────────────────────────────────────────────────────┘
```

---

## Additional Improvements

### 1. Unified Cable Count Badge
Update the Cables tab button to show combined count:

```tsx
<TabButton 
  tabId="cables" 
  label="Cables" 
  count={canvasCableSummary.count + cableEntries.length}
  disabled={!hasCables} 
/>
```

### 2. Section Headers with Counts
Add clear section headers to distinguish data sources:

- **"Traced Cables (3)"** - Visual lines on canvas
- **"Formal Schedule (5)"** - Database `cable_entries`

### 3. Link Canvas to Database Option
Add a "Save to Schedule" button that creates `cable_entries` from drawn lines:

```tsx
{canvasCableSummary.count > 0 && (
  <Button size="sm" variant="outline" onClick={handleSaveLinesToSchedule}>
    <FileText className="h-3 w-3 mr-1" />
    Add to Cable Schedule
  </Button>
)}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `EquipmentPanel.tsx` | Add `LvCableSummary` to Cables tab to show canvas cables |
| `EquipmentPanel.tsx` | Add `canvasCableSummary` useMemo for cable metrics |
| `EquipmentPanel.tsx` | Update tab count badge to include both sources |
| `EquipmentPanel.tsx` | Improve empty state with helpful guidance |

This ensures all materials specific to the current layout markup are visible in the Overview panel, matching user expectations from the Summary tab.

