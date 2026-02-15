# WM Office (Engi-Ops Nexus) - Application Specification

## 1. Executive Summary
**WM Office** is a specialized engineering operations platform designed for electrical engineering project management, calculation, and cost reporting. It automates compliance checks against South African National Standards (SANS 10142-1), manages Bill of Quantities (BOQ), and generates professional documentation. The application is built as a Progressive Web App (PWA) with mobile capabilities via Capacitor.

## 2. Technology Stack
- **Frontend Framework:** React 18 with TypeScript (Vite bundler)
- **UI Library:** shadcn/ui, Tailwind CSS, Lucide Icons
- **State Management:** React Query (TanStack Query)
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Mobile/Native:** Capacitor (iOS/Android support)
- **PDF Generation:** jsPDF, pdfMake, html2canvas
- **File Handling:** SheetJS (Excel), mammoth.js (Word), browser-image-compression

## 3. Core Modules & Functionality

### 3.1 Electrical Calculations Engine
The core engineering module responsible for technical sizing and compliance.
- **Cable Sizing (`src/utils/cableSizing.ts`):**
  - Inputs: Load (Amps), Voltage (230V/400V), Length (m), Installation Method (Air/Ground/Ducts).
  - Logic: Derating factors, voltage drop calculation, impedance checks.
  - Output: Recommended cable size, volt drop %, cost estimation.
  - Standards: SANS 10142-1 & SANS 1507-3 tables.
- **Cable Optimization (`src/utils/cableOptimization.ts`):**
  - Analyzes parallel cable configurations vs single large cables for cost efficiency.
- **Generator Sizing (`src/utils/generatorSizing.ts`):**
  - estimates fuel consumption at various load factors (25%, 50%, 75%, 100%).

### 3.2 Project Cost Management
Tools for financial tracking and reporting.
- **Cost Reporting (`src/utils/costReportCalculations.ts`):**
  - Tracks Original Budget vs. Previous Report vs. Anticipated Final Cost.
  - Calculates variances and percentage of total budget.
  - Validates UI totals against PDF export totals.
- **BOQ Import (`src/utils/excelParser.ts`):**
  - Parses Excel files to extract line items.
  - Auto-detects columns (Item Code, Description, Qty, Rate).

### 3.3 Smart Assemblies
Pre-defined electrical component configurations (`src/data/assemblies.ts`).
- **Structure:** `Assembly` -> `Components` -> `Variants`.
- **Examples:**
  - `SOCKET_16A`: Includes box, cover plate, mechanism, wiring.
  - `DISTRIBUTION_BOARD`: configurable chassis and breakers.
- **Pricing:** Manages supply and install rates per component.

### 3.4 Document Generation
- **PDF Engine (`src/utils/pdfExportBase.ts`):**
  - Standardized headers, footers, and page numbering.
  - Quality presets (Draft/Standard/High).
- **Template System (`src/utils/placeholderDetection.ts`):**
  - Detects placeholders (`{project_name}`) in DOCX files.
  - Supports looping logic for lists.

## 4. Data Architecture (Supabase)

### 4.1 Key Tables (Inferred)
- **`projects`**: Top-level project metadata.
- **`cables` / `circuits`**: Engineering data linked to projects.
- **`cost_reports`**: Financial snapshots.
- **`assemblies`**: Library of standard components.
- **`notifications`**: System alerts (approval requests, mentions).

### 4.2 Security & Access
- **Authentication:** Supabase Auth (Email/Password).
- **Role-Based Access (`src/hooks/useRoleAccess.tsx`):**
  - Roles: `admin`, `moderator`, `user`.
  - Fine-grained permission checks for sensitive actions (e.g., approving budgets).

## 5. Mobile & Offline Capabilities
- **PWA Support:** Service Worker (`sw.js`) for offline caching.
- **Capacitor Integration:**
  - Camera access for site photos.
  - Filesystem access for document storage.
  - Push notifications.

## 6. Key UI/UX Features
- **Toast Notifications:** Real-time feedback (`use-toast.ts`).
- **Activity Logging:** Audit trail for user actions (`useActivityLogger.tsx`).
- **Geo-Location:** Municipality lookup based on coordinates (`useMunicipalityQuery.ts`).
- **Dark Mode:** Built-in theme support.

## 7. Future Roadmap / Missing Features (Observation)
- **BIM Integration:** No direct Revit/IFC import detected yet.
- **Schematic Drawing:** No built-in single-line diagram (SLD) editor found.
- **Procurement:** No direct purchase order generation flow seen.
