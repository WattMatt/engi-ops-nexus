# Recommendations & Code Review

## 1. Code Quality & Maintainability

### 1.1 Hardcoded Data
- **Issue:** Cable sizing tables (`COPPER_CABLE_TABLE`) are hardcoded in `src/utils/cableSizing.ts`.
- **Recommendation:** Move these tables to a JSON configuration file or a database table (Supabase). This allows updates to cable specs (e.g., new standards) without requiring a code deployment.

### 1.2 Type Safety & precision
- **Issue:** Frequent use of `toFixed()` returns strings, which are then cast back to numbers. This can lead to precision loss in complex calculations.
- **Recommendation:** Use `Decimal.js` (already in `package.json`) consistently for all financial and engineering calculations to ensure precision, especially for currency and float operations.

### 1.3 Validation Logic
- **Issue:** The `CRITICAL SAFETY CHECK` in `cableSizing.ts` uses a heuristic (`17.5 / size`) to validate impedance.
- **Recommendation:** Replace heuristics with strict validation against standard SANS tables. If the input data is trusted, remove the heuristic to avoid false positives.

## 2. Performance Optimization

### 2.1 Role Fetching (`useRoleAccess`)
- **Issue:** The `useRoleAccess` hook fetches user roles from Supabase on every component mount.
- **Recommendation:** Cache the user role using React Query or a global state manager (Context/Zustand). This reduces network requests and improves app responsiveness.

### 2.2 Calculation Settings
- **Issue:** `useCalculationSettings` may return `undefined` data when `projectId` is null, rather than falling back to defaults immediately.
- **Recommendation:** Implement `placeholderData` in `useQuery` or handle the `null` case explicitly to ensure components always have default settings available.

## 3. Security

### 3.1 Client-Side Access Control
- **Observation:** `useRoleAccess` provides client-side protection (redirects), which is good for UX but insufficient for security.
- **Recommendation:** Ensure Row Level Security (RLS) policies in Supabase strictly enforce these roles. For example, `cost_reports` should only be editable by `admin` or `moderator` roles at the database level.

## 4. Testing Strategy

### 4.1 Unit Tests
- **Gap:** Critical engineering logic in `cableSizing.ts` and `generatorSizing.ts` needs comprehensive unit tests.
- **Recommendation:** Create test suites using Vitest to verify:
  - Edge cases (e.g., very long cables, high ambient temps).
  - Voltage drop calculations against known standard examples.
  - Fail-safe behavior (e.g., load exceeding max cable capacity).

### 4.2 Integration Tests
- **Gap:** End-to-end flows (e.g., Create Project -> Add Cable -> View Report).
- **Recommendation:** Implement basic integration tests to ensure the calculation engine correctly feeds into the cost reporting module.

## 5. Future Scalability

### 5.1 Document Generation
- **Observation:** PDF generation happens client-side.
- **Recommendation:** For large reports with many images or complex layouts, consider moving PDF generation to a Supabase Edge Function to offload processing power from the client device.
