# Memory: technical/testing-framework-and-standard-v3
Updated: now

The project maintains a robust testing suite (159+ tests) using Vitest and @testing-library/react. 1. Infrastructure: 'testUtils.tsx' provides 'renderWithProviders' and project-specific mock factories. 2. Field Reliability: Offline logic, including IndexedDB persistence and sync-queue merging, is verified using 'fake-indexeddb'. 3. Scope: Coverage focuses on critical hooks (sync, async actions), validation helpers, and shared component accessibility/functionality. 4. Offline Sync Coverage: All three offline modules (cable schedules, budgets, drawing register) have dedicated test suites verifying save/delete operations, file upload queuing, and auto-sync behavior.
