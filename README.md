# WM Office (Web & PWA)

The central web application for the WM Office ecosystem. Built with React, TypeScript, and Vite.

## Features
- **Cost Reporting:** Manage project budgets, variations, and final accounts.
- **Cable Sizing:** Validated engineering calculations (SANS 10142-1).
- **Inspections:** Offline-first site diary and inspection logs (synced from Compliance).
- **Unified Reporting:** Generate PDF reports combining financial data and site photos.

## Setup
1. `npm install`
2. `npm run dev`

## Architecture
- **State:** React Query + Supabase
- **Offline:** IndexedDB + Custom Sync Queue
- **Logic:** Derived from `wm-master-spec`
