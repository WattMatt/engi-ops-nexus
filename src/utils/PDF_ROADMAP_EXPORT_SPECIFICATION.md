# Roadmap Review PDF Export Specification

> **Version:** 1.0  
> **Last Updated:** 2025-01-15  
> **Status:** Implementation Required

---

## 1. Overview

This document specifies the complete behavior for the Roadmap Review PDF export feature. It defines how each export setting should affect the generated PDF document.

---

## 2. Export Options Interface

```typescript
interface RoadmapPDFExportOptions {
  // Report Type
  reportType: 'standard' | 'meeting-review' | 'executive-summary';
  
  // Section Toggles
  includeCoverPage: boolean;           // Default: true
  includeTableOfContents: boolean;     // Default: true
  includeCharts: boolean;              // Default: true (Analytics Charts)
  includeAnalytics: boolean;           // Default: true (Executive Summary metrics)
  includeDetailedProjects: boolean;    // Default: true (Project Details pages)
  includeFullRoadmapItems: boolean;    // Default: false (Full Task Lists)
  includeMeetingNotes: boolean;        // Default: true (Meeting notes section)
  includeSummaryMinutes: boolean;      // Default: true (Summary minutes page)
  
  // Chart Options
  chartLayout: 'stacked' | 'grid';     // Default: 'stacked'
  
  // Branding
  companyLogo?: string | null;         // URL to company logo
  companyName?: string;                // Default: 'Roadmap Review'
  confidentialNotice?: boolean;        // Default: true (footer notice)
}
```

---

## 3. Report Types

### 3.1 Standard Report (`reportType: 'standard'`)

A complete portfolio report without meeting-specific sections.

**Includes (when enabled):**
- Cover Page
- Table of Contents
- Executive Summary (Analytics)
- Charts (Visual Summary)
- Project Details
- Full Roadmap Items

**Excludes (regardless of toggle state):**
- Meeting Notes Sections
- Summary Minutes Page

---

### 3.2 Meeting Review Format (`reportType: 'meeting-review'`)

Full report optimized for team review meetings with writable sections.

**Includes (when enabled):**
- Cover Page
- Table of Contents
- Executive Summary (Analytics)
- Charts (Visual Summary)
- Project Details
- Full Roadmap Items
- **Meeting Notes Sections** (writable areas per project)
- **Summary Minutes Page** (action items, decisions, attendees)

---

### 3.3 Executive Summary Only (`reportType: 'executive-summary'`)

Condensed 2-3 page overview for leadership.

**Includes (when enabled):**
- Cover Page
- Executive Summary (Analytics)
- High-level project status table

**Excludes (regardless of toggle state):**
- Table of Contents
- Charts
- Detailed Project Pages
- Full Roadmap Items
- Meeting Notes
- Summary Minutes

---

## 4. Section Specifications

### 4.1 Cover Page (`includeCoverPage`)

| Setting | Effect |
|---------|--------|
| `true` | Full-page branded cover with: |
|        | - Company logo (if `companyLogo` provided) |
|        | - Report title: "ROADMAP REVIEW REPORT" |
|        | - Company name |
|        | - Generation date/time |
|        | - Optional confidential notice |
| `false` | Skip cover page, start directly with content |

**Implementation:**
```
┌──────────────────────────────────┐
│           [COMPANY LOGO]         │
│                                  │
│    ROADMAP REVIEW REPORT         │
│                                  │
│        {Company Name}            │
│                                  │
│    Generated: Month DD, YYYY     │
│                                  │
│      [CONFIDENTIAL if enabled]   │
└──────────────────────────────────┘
```

---

### 4.2 Table of Contents (`includeTableOfContents`)

| Setting | Effect |
|---------|--------|
| `true` | Generate TOC with: |
|        | - Section titles |
|        | - Page numbers |
|        | - Only includes enabled sections |
| `false` | Skip TOC page |

**Dynamic Entries Based on Options:**
- Executive Summary (if `includeAnalytics`)
- Visual Summary (if `includeCharts` and charts available)
- Project Details (if `includeDetailedProjects`)
- Meeting Notes (if `includeMeetingNotes` AND `reportType === 'meeting-review'`)
- Summary Minutes (if `includeSummaryMinutes` AND `reportType === 'meeting-review'`)
- Full Roadmap Items (if `includeFullRoadmapItems`)

---

### 4.3 Executive Summary / Analytics (`includeAnalytics`)

| Setting | Effect |
|---------|--------|
| `true` | Include portfolio metrics section with: |
|        | - KPI cards (Total Projects, Avg Progress, Portfolio Health, At Risk) |
|        | - Detailed metrics table |
|        | - Priority distribution |
|        | - Resource bottleneck analysis (if data available) |
| `false` | Skip executive summary section |

---

### 4.4 Charts / Visual Summary (`includeCharts`)

| Setting | Effect |
|---------|--------|
| `true` | Include captured chart images |
|        | - Layout controlled by `chartLayout` |
|        | - Max 3 charts for performance |
|        | - Max total size: 150KB |
| `false` | Skip visual summary section entirely |

**Chart Layout Options:**

| `chartLayout` | Behavior |
|---------------|----------|
| `'stacked'` | 1 chart per row, full width |
| `'grid'` | 2 charts per row, side by side |

---

### 4.5 Project Details (`includeDetailedProjects`)

| Setting | Effect |
|---------|--------|
| `true` | Include detailed page(s) for each project: |
|        | - Project name and health score |
|        | - Progress bar visualization |
|        | - Stats grid (Progress %, Items, Overdue, Team) |
|        | - Upcoming tasks table (top 10) |
| `false` | Skip project detail pages |

**Behavior by Report Type:**
- `'executive-summary'`: Always skipped regardless of toggle
- Other types: Follows toggle setting

---

### 4.6 Full Roadmap Items (`includeFullRoadmapItems`)

| Setting | Effect |
|---------|--------|
| `true` | Include complete task list for each project: |
|        | - All roadmap items with status |
|        | - Due dates and priorities |
|        | - Assignees (if available) |
| `false` | Exclude detailed task listings |

**Behavior by Report Type:**
- `'executive-summary'`: Always skipped regardless of toggle
- Other types: Follows toggle setting

**Performance Limit:** Max 6 projects' roadmap items

---

### 4.7 Meeting Notes Sections (`includeMeetingNotes`)

| Setting | Effect |
|---------|--------|
| `true` | Include writable meeting notes areas: |
|        | - Discussion points (lined area) |
|        | - Decisions made (lined area) |
|        | - Action items table |
| `false` | Skip meeting notes sections |

**Availability:** Only when `reportType === 'meeting-review'`

---

### 4.8 Summary Minutes Page (`includeSummaryMinutes`)

| Setting | Effect |
|---------|--------|
| `true` | Include dedicated summary page with: |
|        | - Meeting date/time fields |
|        | - Attendees section |
|        | - Key decisions summary |
|        | - Action items with owners and due dates |
|        | - Next steps |
| `false` | Skip summary minutes page |

**Availability:** Only when `reportType === 'meeting-review'`

---

## 5. Branding Settings

### 5.1 Company Logo (`companyLogo`)

| Value | Effect |
|-------|--------|
| `string` (URL) | Display logo on cover page and optionally in header |
| `null` / `undefined` | No logo displayed |

---

### 5.2 Company Name (`companyName`)

| Value | Effect |
|-------|--------|
| `string` | Displayed on cover page, in headers |
| Default | "Roadmap Review" |

---

### 5.3 Confidential Notice (`confidentialNotice`)

| Setting | Effect |
|---------|--------|
| `true` | Add footer text: "CONFIDENTIAL - For internal use only" |
| `false` | No confidential notice in footer |

---

## 6. Page Structure by Report Type

### Standard Report
```
1. Cover Page (optional)
2. Table of Contents (optional)
3. Executive Summary (optional)
4. Visual Summary / Charts (optional)
5. Project Details (optional, multiple pages)
6. Full Roadmap Items (optional, multiple pages)
```

### Meeting Review
```
1. Cover Page (optional)
2. Table of Contents (optional)
3. Executive Summary (optional)
4. Visual Summary / Charts (optional)
5. Project Details (optional, multiple pages)
6. Meeting Notes Section (optional)
7. Summary Minutes Page (optional)
8. Full Roadmap Items (optional, multiple pages)
```

### Executive Summary
```
1. Cover Page (optional)
2. Executive Summary (required)
3. Project Status Table (single page)
```

---

## 7. Footer Specifications

All pages (except cover page) should include:

```
┌────────────────────────────────────────────────────────────┐
│ [Confidential Notice]              Page X of Y             │
└────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Checklist

- [ ] `includeCoverPage` - Cover page generation
- [ ] `includeTableOfContents` - Dynamic TOC with page numbers
- [ ] `includeAnalytics` - Executive summary metrics
- [ ] `includeCharts` - Chart image embedding
- [ ] `chartLayout` - Stacked vs Grid layout
- [ ] `includeDetailedProjects` - Per-project detail pages
- [ ] `includeFullRoadmapItems` - Complete task listings
- [ ] `includeMeetingNotes` - Writable notes sections
- [ ] `includeSummaryMinutes` - Meeting summary page
- [ ] `companyLogo` - Logo on cover/headers
- [ ] `companyName` - Branding text
- [ ] `confidentialNotice` - Footer notice
- [ ] `reportType: 'standard'` - Exclude meeting sections
- [ ] `reportType: 'meeting-review'` - Include all sections
- [ ] `reportType: 'executive-summary'` - Condensed format

---

## 9. Performance Constraints

| Constraint | Limit | Reason |
|------------|-------|--------|
| Max Projects in Details | 20 | jsPDF performance |
| Max Projects in Roadmap Items | 6 | Table generation time |
| Max Charts | 3 | Image size limits |
| Max Chart Total Size | 150KB | Memory constraints |
| Target Generation Time | < 5 seconds | User experience |

---

## 10. Testing Matrix

| Option | Standard | Meeting | Executive |
|--------|----------|---------|-----------|
| Cover Page | ✓ | ✓ | ✓ |
| TOC | ✓ | ✓ | ✗ |
| Analytics | ✓ | ✓ | ✓ |
| Charts | ✓ | ✓ | ✗ |
| Project Details | ✓ | ✓ | ✗ |
| Full Roadmap | ✓ | ✓ | ✗ |
| Meeting Notes | ✗ | ✓ | ✗ |
| Summary Minutes | ✗ | ✓ | ✗ |

---

## 11. Future Improvements

1. **Quick Export Mode** - Minimal 1-page summary for instant saves
2. **Progress Indicators** - Show generation progress to user
3. **Retry Logic** - Auto-simplify if generation fails
4. **Custom Sections** - Allow user-defined sections
5. **Template System** - Saveable export presets
