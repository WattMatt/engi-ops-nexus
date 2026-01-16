# PDF Generation Engine Audit Report

**Date:** January 16, 2026  
**Goal:** Centralize all PDF generation through the Unified PDF Engine

---

## Executive Summary

The codebase has a **Unified PDF Engine** (`src/utils/pdfmake/engine/`) ready to use, but most components **bypass it entirely** and use legacy code. This audit identifies all PDF generation points and their migration status.

---

## Architecture Goal

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Cost Report    │  │ Roadmap Review  │  │ Tenant Eval     │  │ Cable Schedule  │
│  Export Button  │  │ Export Button   │  │ Export Button   │  │ Export Button   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │     UNIFIED PDF ENGINE               │
                    │  src/utils/pdfmake/engine/           │
                    │                                      │
                    │  • generatePDF(type, data, config)   │
                    │  • downloadPDF(type, data, config)   │
                    │  • openPDF(type, data, config)       │
                    └──────────────────┬───────────────────┘
                                       │
                    ┌──────────────────┴───────────────────┐
                    │                                      │
                    ▼                                      ▼
         ┌────────────────────┐              ┌────────────────────┐
         │   CLIENT-SIDE      │              │   SERVER-SIDE      │
         │   (pdfmake)        │              │   (Edge Function)  │
         └────────────────────┘              └────────────────────┘
```

---

## Current State: PDF Generation Points

### ✅ REGISTERED in Unified Engine (but not always used)

| Report Type | Registration File | Status |
|------------|------------------|--------|
| `roadmap-review` | `engine/registrations/roadmapReview.ts` | ⚠️ Partial - uses custom builder |
| `cost-report` | `engine/registrations/costReport.ts` | ❌ Bypassed - uses legacy jsPDF |
| `tenant-evaluation` | `engine/registrations/tenantEvaluation.ts` | ⚠️ Uses dedicated edge function |
| `custom` | `engine/registrations/custom.ts` | ✅ Available |

### ❌ NOT YET REGISTERED

| Report Type | Current Implementation | Lines of Code |
|------------|----------------------|---------------|
| Generator Report | `GeneratorReportExportPDFButton.tsx` | ~300 |
| Cable Schedule | `CableScheduleExportPDFButton.tsx` | ~400 |
| Tenant Completion | `TenantCompletionExportPDFButton.tsx` | ~350 |
| HR Payslip | `GeneratePayslipDialog.tsx` | ~200 |
| Floor Plan | `floor-plan/utils/pdfGenerator.ts` | ~150 |
| Project Outline | Various locations | ~100 |

---

## Detailed Component Analysis

### 1. Cost Reports (`ExportPDFButton.tsx`)
**Status:** ❌ Legacy - Highest Priority  
**Current Lines:** ~1,720  
**Uses:** jsPDF + jspdf-autotable  
**Features:**
- Word template support (server-side via edge function)
- Cover page generation
- Executive summary section
- Category details with cards
- Charts capture
- Variations section
- Multi-section toggle

**Migration Path:**
1. Enhance `cost-report` registration with all sections
2. Add Word template support to engine
3. Replace 1,700 lines with ~50 line call

### 2. Roadmap Review (`AdminRoadmapReview.tsx`)
**Status:** ⚠️ Hybrid  
**Uses:** Custom `generateRoadmapPdfBlob` + edge function  
**Note:** Already uses pdfmake but via custom builder, not unified engine

**Migration Path:**
1. Route through `generatePDF('roadmap-review', data)`
2. Remove custom builder calls

### 3. Tenant Evaluation (`TenantEvaluationFormDialog.tsx`)
**Status:** ⚠️ Server-only  
**Uses:** Dedicated `generate-tenant-evaluation-pdf` edge function  
**Note:** Has registration but uses separate function

**Migration Path:**
1. Use `generate-unified-pdf` edge function
2. Call through unified engine

### 4. Generator Reports (`GeneratorReportExportPDFButton.tsx`)
**Status:** ❌ Legacy  
**Uses:** jsPDF  

**Migration Path:**
1. Create `generator-report` registration
2. Build content functions
3. Replace button logic

### 5. Cable Schedules (`CableScheduleExportPDFButton.tsx`)
**Status:** ❌ Legacy  
**Uses:** jsPDF  

**Migration Path:**
1. Create `cable-schedule` registration
2. Build content functions
3. Replace button logic

### 6. HR Payslips (`GeneratePayslipDialog.tsx`)
**Status:** ❌ Legacy  
**Uses:** Local jsPDF generator  
**Note:** Uses `generatePayslipPDF` from pdfmake utils

**Migration Path:**
1. Create `payslip` registration
2. Already has pdfmake builder, just needs registration

### 7. Floor Plans (`floor-plan/utils/pdfGenerator.ts`)
**Status:** ❌ Custom  
**Uses:** HTML5 Canvas → jsPDF  
**Note:** Special case - requires canvas rendering

**Migration Path:**
1. Create `floor-plan` registration
2. Add canvas-to-content conversion
3. May need special handling

---

## Edge Functions Status

| Function | Purpose | Status |
|----------|---------|--------|
| `generate-unified-pdf` | Central PDF generation | ✅ Exists but underused |
| `generate-roadmap-pdf` | Dedicated roadmap | ⚠️ Should merge |
| `generate-tenant-evaluation-pdf` | Dedicated tenant eval | ⚠️ Should merge |
| `convert-word-to-pdf` | Word template conversion | ✅ Keep separate |

---

## Migration Priority

### Phase 1: High Impact (Week 1)
1. **Cost Reports** - Most used, highest code reduction
2. **Roadmap Review** - Already pdfmake, easy to route

### Phase 2: Medium Impact (Week 2)
3. **Generator Reports** - Similar structure to cost reports
4. **Cable Schedules** - Well-defined data structure

### Phase 3: Complete Coverage (Week 3)
5. **Tenant Evaluation** - Route through unified function
6. **HR Payslips** - Already has pdfmake builder
7. **Floor Plans** - Special handling needed

---

## Estimated Code Reduction

| Component | Current Lines | After Migration |
|-----------|--------------|-----------------|
| Cost Reports | 1,720 | ~80 |
| Generator Reports | 300 | ~50 |
| Cable Schedules | 400 | ~50 |
| Tenant Completion | 350 | ~50 |
| HR Payslips | 200 | ~40 |
| **TOTAL** | **2,970** | **~270** |

**Reduction: ~2,700 lines (91%)**

---

## Action Items

### Immediate
- [ ] Create migration tracking in this file
- [ ] Update `cost-report` registration with all section builders
- [ ] Add Word template path to unified engine

### Short-term
- [ ] Create registrations for missing report types
- [ ] Consolidate edge functions to `generate-unified-pdf`
- [ ] Update all export buttons to use `downloadPDF()`

### Long-term
- [ ] Remove legacy jsPDF utilities
- [ ] Archive `pdfExportBase.ts`
- [ ] Single source of truth achieved

---

## Files to Update During Migration

### Engine Core (add features)
- `src/utils/pdfmake/engine/types.ts` - Add new report types
- `src/utils/pdfmake/engine/generator.ts` - Add template support

### New Registrations Needed
- `src/utils/pdfmake/engine/registrations/generatorReport.ts`
- `src/utils/pdfmake/engine/registrations/cableSchedule.ts`
- `src/utils/pdfmake/engine/registrations/payslip.ts`
- `src/utils/pdfmake/engine/registrations/floorPlan.ts`

### Components to Refactor
- `src/components/cost-reports/ExportPDFButton.tsx`
- `src/components/tenant/GeneratorReportExportPDFButton.tsx`
- `src/components/cable-schedules/CableScheduleExportPDFButton.tsx`
- `src/components/handover/TenantCompletionExportPDFButton.tsx`
- `src/components/hr/GeneratePayslipDialog.tsx`
- `src/pages/AdminRoadmapReview.tsx`

### Files to Archive (after migration)
- `src/utils/pdfExportBase.ts`
- `src/utils/pdfQualitySettings.ts` (partial - keep chart capture)
- Individual section builders in `cost-reports/pdf-export/sections/`

---

## Next Steps

Ready to proceed with **Phase 1: Cost Reports Migration**?

This will:
1. Enhance the `cost-report` registration with all section builders
2. Add Word template support to the unified engine
3. Replace 1,720 lines in `ExportPDFButton.tsx` with unified engine calls
