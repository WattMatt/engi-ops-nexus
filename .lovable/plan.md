
# Plan: Review, Test, and Improve the AI Application Review Process

## Overview
Comprehensive enhancement of the AI Application Review system to provide more actionable, context-aware, and measurable insights with improved testing capabilities and a streamlined implementation workflow.

---

## Current State Analysis

### Existing Components
| Component | Status | Issues Identified |
|-----------|--------|-------------------|
| `ai-review-application` Edge Function | Working | Limited context (only table names), no code analysis |
| `send-review-findings` Edge Function | Partial | Response format mismatch (`sections` vs `categories`) |
| `ApplicationReviewDialog` | Working | Good UI but missing real-time streaming feedback |
| `ReviewHistoryDashboard` | Working | No category-level trend charts |
| `ProgressTrackingView` | Working | No automatic linking between reviews |
| `ReviewComparisonView` | Working | No resolved/new issue highlighting |
| Database Schema | Adequate | Missing `reviewer_notes`, `implementation_prs` columns |

### Key Issues Found
1. **Response Format Mismatch**: `send-review-findings` expects `sections[].findings` but `ai-review-application` returns `categories[].issues`
2. **Limited Context**: AI only receives table names, not actual codebase structure or patterns
3. **No Streaming**: 30-60 second wait with no progress indication
4. **No Scheduled Reviews**: Manual trigger only
5. **Generic Recommendations**: Not tailored to specific project context

---

## Implementation Plan

### Phase 1: Fix Response Format Mismatch

Update `send-review-findings` to correctly parse the AI review response:

| Current Code | Issue | Fix |
|--------------|-------|-----|
| `reviewData.sections[].findings` | Field doesn't exist | Use `reviewData.categories[].issues` |
| `finding.severity` | May be undefined | Default to "medium" |
| Email summary counts | Uses wrong structure | Iterate over categories |

### Phase 2: Enhanced AI Context

Provide richer context to the AI for more specific recommendations:

**New Context Sources:**
- File structure summary (component directories, page count)
- Recent git-like activity (recently modified areas)
- Database schema with relationships
- Edge function inventory
- Storage bucket configurations
- RLS policy status summary
- Previous review findings for comparison

**Updated Prompt Structure:**
```text
CODEBASE STRUCTURE:
├── src/components/ (147 components)
├── src/pages/ (23 pages)
├── supabase/functions/ (68 edge functions)
└── src/hooks/ (34 custom hooks)

RECENT FOCUS AREAS:
- Report automation (last 7 days)
- Cable schedule improvements (last 14 days)

DATABASE TABLES (with RLS status):
- projects (RLS: enabled, 4 policies)
- tenants (RLS: enabled, 3 policies)
- cable_schedules (RLS: enabled, 2 policies)

PREVIOUS REVIEW (score: 78):
- High: RLS complexity in multi-tenancy (unresolved)
- Medium: Large dataset rendering (in progress)
```

### Phase 3: Streaming Review Progress

Implement real-time streaming to show review progress:

**Backend Changes:**
- Add streaming response mode to edge function
- Send progress updates as SSE events
- Categories analyzed in sequence with status updates

**Frontend Changes:**
```text
[Analyzing UI/UX...] ████████░░ 40%
✓ UI/UX: Score 82
✓ Performance: Score 74
→ Security: Analyzing...
```

### Phase 4: Review Scheduling

Add automated scheduled reviews:

| Schedule Option | Description |
|-----------------|-------------|
| Weekly | Every Monday 6:00 AM |
| Bi-weekly | Every other Monday |
| Monthly | First of month |
| Manual only | Current behavior |

**Database Addition:**
```sql
CREATE TABLE review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type TEXT NOT NULL, -- weekly, biweekly, monthly
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  notification_email TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Phase 5: Actionable Implementation Prompts

Enhance the implementation prompt generation:

**Current:** Generic markdown prompts
**Improved:** 
- Context-aware prompts with file paths
- Dependency order for related changes
- Test suggestions per fix
- Rollback guidance

**Example Enhanced Prompt:**
```text
## Fix: Large Dataset Rendering in Cable Schedules

### Affected Files:
- src/components/cable-schedules/CableTagSchedule.tsx
- src/components/cable-schedules/CableScheduleTable.tsx

### Implementation Steps:
1. Install @tanstack/react-virtual if not present
2. Wrap table body with Virtualizer
3. Update row height calculations

### Test Criteria:
- [ ] Load schedule with 1000+ cables
- [ ] Scroll performance < 16ms frame time
- [ ] Filter/sort maintains virtualization

### Rollback:
If issues occur, revert virtualization wrapper only
```

### Phase 6: Review Comparison Improvements

Enhance the comparison view with:

1. **Resolved Issues Highlight**: Show issues from previous review that no longer appear
2. **New Issues Alert**: Highlight issues that are new since last review
3. **Score Delta Visualization**: Category-by-category change indicators
4. **Recommendation Diff**: Side-by-side recommendation comparison

---

## File Changes Summary

### Modified Edge Functions
| File | Changes |
|------|---------|
| `supabase/functions/ai-review-application/index.ts` | Add richer context, streaming mode |
| `supabase/functions/send-review-findings/index.ts` | Fix response parsing, use `categories.issues` |

### Modified UI Components
| File | Changes |
|------|---------|
| `src/components/admin/ApplicationReviewDialog.tsx` | Add streaming progress UI, enhanced prompts |
| `src/components/admin/ReviewHistoryDashboard.tsx` | Add category trend charts |
| `src/components/admin/ProgressTrackingView.tsx` | Auto-link between reviews |
| `src/components/admin/ReviewComparisonView.tsx` | Add resolved/new issue highlighting |

### New Components
| File | Purpose |
|------|---------|
| `src/components/admin/ReviewScheduleSettings.tsx` | Schedule configuration UI |
| `src/components/admin/ReviewStreamingProgress.tsx` | Real-time progress display |

### Database Migrations
- Add `review_schedules` table
- Add `previous_review_id` column to `application_reviews`
- Add `resolved_from_review_id` column to track fixed issues

---

## Improvement Priority Order

| Priority | Enhancement | Impact | Effort |
|----------|-------------|--------|--------|
| 1 | Fix response format mismatch | Critical | Low |
| 2 | Enhanced AI context | High | Medium |
| 3 | Resolved/new issue highlighting | High | Low |
| 4 | Streaming progress UI | Medium | Medium |
| 5 | Actionable prompts with file paths | Medium | Medium |
| 6 | Review scheduling | Medium | High |
| 7 | Category trend charts | Low | Medium |

---

## Testing Plan

### Manual Testing
1. Run a new review and verify all categories are populated
2. Trigger email notification and verify findings are correctly extracted
3. Compare two reviews and verify issue diff detection
4. Test progress tracking status updates

### Edge Cases
- Empty categories (no issues found)
- AI rate limiting (429 errors)
- Very long recommendations (truncation)
- Reviews with different focus areas

---

## Additional Improvement Suggestions

After core implementation:

1. **AI-Suggested Code Fixes**: Generate actual code snippets for common issues
2. **Integration with Roadmap**: Auto-create roadmap items from high-priority findings
3. **Team Review Assignment**: Assign issues to team members
4. **Export to PDF**: Generate professional review report document
5. **Benchmark Comparison**: Compare scores against industry standards
