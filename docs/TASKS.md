# WM Office - Action Plan

## Phase 1: 🚨 Critical Fixes (Safety & Bugs)
*   [ ] **Validate Cable Data:** Verify `src/utils/cableSizing.ts` tables against official SANS 10142-1 (2020) standards.
*   [ ] **Fix Impedance Check:** Remove the "magic number" check (`17.5 / size`) in `cableSizing.ts` or replace it with a standard lookup.
*   [ ] **Security Audit:** Review Supabase RLS policies to ensure only admins can approve budgets (backend check).

## Phase 2: 🏗️ Refactoring (Cleanup & Precision)
*   [ ] **Extract Constants:** Move `COPPER_CABLE_TABLE` and `ALUMINIUM_CABLE_TABLE` out of logic files into a dedicated `src/data/cable-specs.ts` or JSON file.
*   [ ] **Adopt Decimal.js:** Refactor `cableSizing.ts` to use `Decimal.js` for all currency and voltage drop calculations (replace `toFixed` strings).
*   [ ] **Standardize Voltage Drop:** Ensure `calculateVoltDrop` always uses the full `CableData` object, removing legacy fallback logic.

## Phase 3: ⚡ Performance & UX
*   [ ] **Cache User Role:** Update `useRoleAccess.tsx` to cache the user role in React Context or Query (stop fetching on every page load).
*   [ ] **Fix Settings Loading:** Modify `useCalculationSettings.tsx` to return default settings immediately if `projectId` is missing (avoid `undefined` states).

## Phase 4: 🧪 Testing & Reliability
*   [ ] **Unit Tests (Cables):** Write Vitest tests for `calculateCableSize` covering:
    *   Single phase vs 3-phase.
    *   Long distances (voltage drop limits).
    *   High currents (parallel cables).
*   [ ] **Unit Tests (Generators):** Verify generator sizing logic against known load profiles.

## Phase 5: 🚀 Future Features (Backlog)
*   [ ] **BIM Import:** Research Revit/IFC file parsing libraries.
*   [ ] **Single Line Diagrams:** Prototype a simple SVG-based schematic editor.
*   [ ] **Procurement:** Design a "Purchase Order" table in Supabase.
