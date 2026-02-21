# WM Office (Engi-Ops Nexus) — Master Application Document
## Comprehensive Technical & Functional Reference
**Version:** 2.0 | **Generated:** 2026-02-21 | **Platform:** React 18 / Vite / TypeScript / Supabase

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Routing & Navigation Structure](#4-routing--navigation-structure)
5. [Page-by-Page Breakdown](#5-page-by-page-breakdown)
6. [Component Architecture — Full Inventory](#6-component-architecture--full-inventory)
7. [Custom Hooks — Full Inventory](#7-custom-hooks--full-inventory)
8. [Edge Functions (Backend) — Full Inventory](#8-edge-functions-backend--full-inventory)
9. [Database Schema & Functions](#9-database-schema--functions)
10. [Utility & Library Modules — Full Inventory](#10-utility--library-modules--full-inventory)
11. [Type Definitions](#11-type-definitions)
12. [Contexts & Providers](#12-contexts--providers)
13. [External Portals & Token-Based Access](#13-external-portals--token-based-access)
14. [PWA & Offline Capabilities](#14-pwa--offline-capabilities)
15. [PDF Generation & Reporting Engine — Full Inventory](#15-pdf-generation--reporting-engine--full-inventory)
16. [Messaging & Notifications](#16-messaging--notifications)
17. [AI Integration](#17-ai-integration)
18. [Walkthrough & Onboarding System](#18-walkthrough--onboarding-system)
19. [Inter-Page Communication & Data Flow](#19-inter-page-communication--data-flow)
20. [Security Model](#20-security-model)
21. [Admin Panel — Full Breakdown](#21-admin-panel--full-breakdown)
22. [Settings — Full Breakdown](#22-settings--full-breakdown)

---

## 1. Application Overview

**WM Office** is a specialized engineering operations platform for electrical project management, compliance (SANS 10142-1), and professional documentation. It runs as a PWA with Capacitor support for native mobile deployment.

### Core Value Propositions
- End-to-end electrical project lifecycle management
- Automated cable sizing, generator estimation, and cost reporting
- Multi-stakeholder portals (clients, contractors, site electricians)
- SANS 10142-1 / SANS 204 compliance tracking
- Bulk services application workflow (utility-grade power supply)
- Real-time collaboration with messaging, notifications, and presence

### Users & Roles
| Role | Access Level | Description |
|------|-------------|-------------|
| **Admin** | Full system | Platform administration, user management, finance, gamification, backups, AI review, feedback management, PRD management, email templates, PDF compliance |
| **Moderator** | Elevated | Project oversight, report approvals |
| **User** | Standard | Project member, engineering tasks |
| **Client** | External portal | Token-based read access to project reports, approval/rejection, comments |
| **Contractor** | External portal | Token-based access to drawings, procurement, inspections, DB legend cards, RFIs, cable status, tenant tracker |
| **Site Electrician** | External portal | Cable verification with GPS + photo evidence, digital signatures |

---

## 2. Tech Stack & Architecture

### Frontend
| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | React 18 (Vite bundler) | Lazy-loaded routes via `React.lazy()` + `Suspense` |
| Language | TypeScript 5.x | Strict mode, Zod validation |
| UI System | shadcn/ui (Radix Primitives) + Tailwind CSS 3.4 | 50+ UI primitives in `src/components/ui/` |
| Icons | Lucide React (`lucide-react@0.462.0`) | Consistent icon set across all pages |
| Charts | Recharts 2.x | Used in dashboard, finance, analytics |
| State/Data | TanStack Query v5 (`@tanstack/react-query@5.83.0`) | 5-min stale time, 30-min GC, no refetch-on-focus |
| Validation | Zod 3.x | Form validation and API response validation |
| Routing | React Router v6 (`react-router-dom@6.30.1`) | Nested routes with layout components |
| Theme | next-themes | Light/dark/system with CSS variable tokens |
| Rich Text | TipTap (heading, placeholder, text-align, underline) | Used in messages and document editing |
| Canvas | Fabric.js 6.7 | Floor plan markup, annotation, cable routes |
| Maps | Mapbox GL 3.16 + Geocoder | Climatic zone mapping in Bulk Services |
| Drag & Drop | @dnd-kit (core + sortable + utilities) | Kanban board in Site Diary |
| Virtual Scrolling | @tanstack/react-virtual 3.13 | VirtualizedCableTable for large cable schedules |
| PDF Viewer | react-pdf 10.2 | Document preview dialogs |
| Image Compression | browser-image-compression 2.0 | Client-side photo optimization |
| Excel Processing | xlsx 0.18.5 | Import/export for BOQ, cable schedules, budgets, tenants |
| Word Processing | mammoth 1.11 + docx 9.5 | Word document import/generation |
| Animations | canvas-confetti 1.9 | Celebration overlays on completions |
| Resizable Panels | react-resizable-panels 2.1 | Split view layouts |
| Confetti | canvas-confetti | Celebration effects |

### Backend (Lovable Cloud)
| Service | Usage | Details |
|---------|-------|---------|
| **Auth** | Email/password, password reset, role-based access | JWT-based with `must_change_password` flag |
| **Postgres** | 300+ tables, RLS policies, triggers, functions | Row-level security on all tables |
| **Edge Functions** | 78 Deno serverless functions | Auto-deployed, CORS-enabled |
| **Storage** | File uploads | Buckets: project-drawings, cable-verification-photos, tenant-documents, handover-documents, budget-reference-drawings, invoice-pdfs, etc. |
| **Realtime** | Live messaging, typing indicators | postgres_changes subscription |

### Mobile
| Technology | Plugin | Purpose |
|-----------|--------|---------|
| Vite PWA Plugin | vite-plugin-pwa 1.2 | Service worker registration, offline caching |
| Capacitor 8 | @capacitor/core 8.0 | Native iOS/Android wrapper |
| | @capacitor/camera | Photo capture for inspections, verification |
| | @capacitor/filesystem | Local file read/write |
| | @capacitor/haptics | Tactile feedback on actions |
| | @capacitor/push-notifications | Native push notification registration |
| | @capacitor/share | Native share sheet |
| | @capacitor/splash-screen | App launch screen |
| | @capacitor/status-bar | Status bar styling |
| | @capacitor/local-notifications | Scheduled local alerts |
| | @capacitor/network | Network status detection |
| | @capacitor/keyboard | Keyboard open/close handling |
| | @capacitor/device | Device info |
| | @capacitor/app | App lifecycle events |

### Provider Tree (App.tsx)
```
ErrorBoundary
  └── ThemeProvider (next-themes: attribute="class", defaultTheme="system")
      └── QueryClientProvider (staleTime=5min, gcTime=30min, retry=1)
          └── TooltipProvider
              └── WalkthroughProvider
                  └── ConflictProvider
                      ├── Toaster (shadcn)
                      ├── Sonner (toast notifications)
                      ├── OfflineIndicator
                      ├── PWAUpdatePrompt
                      ├── PWAInstallPrompt
                      ├── ConflictResolutionDialog
                      ├── HelpButton (global)
                      └── BrowserRouter
                          ├── StorageWarningBanner
                          ├── WalkthroughController (10 tours)
                          └── Suspense (PageLoadingSpinner)
                              └── Routes (all pages)
```

---

## 3. Authentication & Authorization

### Auth Flow (Step by Step)
1. User navigates to `/` (landing page) → clicks "Login" → redirects to `/auth`
2. `/auth` page shows email/password form with login & signup tabs, plus "Forgot Password" link
3. **Login:** `supabase.auth.signInWithPassword({ email, password })` → on success → redirect to `/projects`
4. **Signup:** `supabase.auth.signUp({ email, password })` → email confirmation required (NOT auto-confirm)
5. **Forgot Password:** Sends reset email → user clicks link → `/auth/set-password` page → `supabase.auth.updateUser({ password })`
6. **First Login:** If `profiles.must_change_password === true`, `FirstLoginModal` overlays requiring password change before any action
7. **Project Selection:** `/projects` page lists all projects from `project_members` join → user clicks a project → `selectedProjectId` stored in `localStorage` → redirect to `/dashboard`
8. **Session Monitor:** `useSessionMonitor` hook watches for session expiry → auto-redirects to `/auth`

### Implementation Files
| File | Purpose |
|------|---------|
| `src/pages/Auth.tsx` | Login form, signup form, forgot password link |
| `src/pages/SetPassword.tsx` | Password reset callback page (from email link) |
| `src/components/auth/FirstLoginModal.tsx` | Forced password change modal on first login |
| `src/hooks/useSessionMonitor.ts` | Auto-logout on session expiry |
| `src/hooks/useRoleAccess.tsx` | Role hierarchy check with `hasAccess(requiredRole)` |
| `src/hooks/useUserRole.tsx` | Fetch current user's role from `user_roles` table |

### Role Enforcement Details
| Mechanism | Implementation |
|-----------|---------------|
| **Role storage** | `user_roles` table: `user_id` (UUID) + `role` (text: 'admin', 'moderator', 'user') |
| **Admin check** | `is_admin(user_id)` DB function → returns boolean |
| **Project access** | `project_members` table: `user_id`, `project_id`, `position` (owner/admin/primary/secondary/member) |
| **Project access check** | `has_project_access(user_id, project_id)` DB function |
| **RLS helper** | `user_has_project_access(_project_id)` — combines `is_admin()` OR `has_project_access()` |
| **Engineer uniqueness** | `check_unique_engineer_position()` trigger → enforces only one primary and one secondary engineer per project |
| **Client access** | `client_has_project_access(user_id, project_id)` + `client_project_access` table |
| **Token access** | `has_valid_client_portal_token(project_id)` / `has_valid_contractor_portal_token(project_id)` |

### Admin User Management (Step by Step)
1. Admin navigates to `/admin/users` → sees all users list from `profiles` table
2. **Invite User:** Admin clicks "Invite" → calls `invite-user` edge function → creates auth user + profile → sends email with temporary password
3. **Set Password:** Admin clicks "Set Password" on a user → calls `set-user-password` edge function → validates password strength (12+ chars, uppercase, lowercase, number, special char) → updates password + sets `must_change_password = true` + `status = 'active'`
4. **Reset Password:** Admin clicks "Reset Password" → calls `admin-reset-password` or `reset-user-password` → forces password reset on next login

---

## 4. Routing & Navigation Structure

### Complete Route Map

#### Public Routes (no auth required)
| Route | Page Component | File | Purpose |
|-------|---------------|------|---------|
| `/` | `Index` | `src/pages/Index.tsx` | Marketing landing page |
| `/auth` | `Auth` | `src/pages/Auth.tsx` | Login / Signup |
| `/auth/set-password` | `SetPassword` | `src/pages/SetPassword.tsx` | Password reset callback |
| `/master-library` | `MasterLibrary` | `src/pages/MasterLibrary.tsx` | Global materials library |
| `/contact-library` | `ContactLibrary` | `src/pages/ContactLibrary.tsx` | Global contacts |
| `/projects` | `ProjectSelect` | `src/pages/ProjectSelect.tsx` | Project selection |
| `/settings` | `Settings` | `src/pages/Settings.tsx` | User settings |

#### External Portal Routes (token-based, no auth)
| Route | Page Component | File | Purpose |
|-------|---------------|------|---------|
| `/client-portal` | `ClientPortal` | `src/pages/ClientPortal.tsx` | Client portal landing (enter token) |
| `/client/tenant-report/:projectId` | `ClientTenantReport` | `src/pages/client/ClientTenantReport.tsx` | Client view of tenant schedule |
| `/client/generator-report/:projectId` | `ClientGeneratorReport` | `src/pages/client/ClientGeneratorReport.tsx` | Client view of generator report |
| `/client/documents/:projectId` | `ClientDocumentsPage` | `src/pages/client/ClientDocumentsPage.tsx` | Client document downloads |
| `/client-view` | `ClientView` | `src/pages/ClientView.tsx` | General client view |
| `/generator-report/:token` | `ClientGeneratorReportView` | `src/pages/ClientGeneratorReportView.tsx` | Shared generator report (token link) |
| `/contractor-portal` | `ContractorPortal` | `src/pages/ContractorPortal.tsx` | Contractor portal (enter token) |
| `/p/:code` | `PortalRedirect` | `src/pages/PortalRedirect.tsx` | Short code redirect to contractor portal |
| `/review/:accessToken` | `ContractorReviewPortal` | `src/pages/ContractorReviewPortal.tsx` | Contractor review portal |
| `/cable-verification` | `CableVerificationPortal` | `src/pages/CableVerificationPortal.tsx` | Mobile cable verification |
| `/handover-client` | `HandoverClient` | `src/pages/HandoverClient.tsx` | Client handover document access |
| `/handover-client-management` | `HandoverClientManagement` | `src/pages/HandoverClientManagement.tsx` | Admin handover management |
| `/roadmap-review/:token` | `ExternalRoadmapReview` | `src/pages/ExternalRoadmapReview.tsx` | External roadmap review |
| `/projects/:projectId/roadmap` | `RoadmapItemRedirect` | `src/pages/RoadmapItemRedirect.tsx` | Deep link to specific roadmap item |

#### Admin Routes (role: admin)
| Route | Page Component | File | Purpose |
|-------|---------------|------|---------|
| `/admin` | `AdminLayout` (index: `ProjectSelect`) | `src/pages/AdminLayout.tsx` | Admin layout wrapper |
| `/admin/projects` | `ProjectSelect` | `src/pages/ProjectSelect.tsx` | All projects overview |
| `/admin/finance` | `Finance` | `src/pages/Finance.tsx` | Financial management |
| `/admin/invoicing` | `Invoicing` | `src/pages/Invoicing.tsx` | Invoice management |
| `/admin/staff` | `StaffManagement` | `src/pages/StaffManagement.tsx` | HR/Staff management |
| `/admin/users` | `UserManagement` | `src/pages/UserManagement.tsx` | User accounts management |
| `/admin/backup` | `BackupManagement` | `src/pages/BackupManagement.tsx` | Database backup management |
| `/admin/gamification` | `GamificationAdmin` | `src/pages/GamificationAdmin.tsx` | Gamification settings |
| `/admin/ai-review` | `AdminAIReview` | `src/pages/AdminAIReview.tsx` | AI application review |
| `/admin/feedback` | `FeedbackManagement` | `src/pages/FeedbackManagement.tsx` | User feedback management |
| `/admin/feedback-analytics` | `FeedbackAnalytics` | `src/pages/FeedbackAnalytics.tsx` | Feedback analytics dashboard |
| `/admin/settings` | `Settings` | `src/pages/Settings.tsx` | System settings |
| `/admin/prd-manager` | `PRDManager` | `src/pages/PRDManager.tsx` | PRD document management |
| `/admin/email-templates` | `EmailTemplatesAdmin` | `src/components/admin/email-templates/EmailTemplatesAdmin.tsx` | Email template management |
| `/admin/email-templates/:id` | `EmailTemplateEditor` | `src/components/admin/email-templates/EmailTemplateEditor.tsx` | Edit specific email template |
| `/admin/pdf-compliance` | `PdfComplianceDashboard` | `src/pages/PdfComplianceDashboard.tsx` | PDF compliance checking |

#### Dashboard Routes (auth + project required)
| Route | Page Component | File | Workspace |
|-------|---------------|------|-----------|
| `/dashboard` | `Dashboard` | `src/pages/Dashboard.tsx` | Core Project |
| `/dashboard/roadmap` | `ProjectRoadmap` | `src/pages/ProjectRoadmap.tsx` | Core Project |
| `/dashboard/roadmap-review` | `RoadmapReviewMode` | `src/pages/RoadmapReviewMode.tsx` | Core Project |
| `/dashboard/project-outline` | `ProjectOutline` | `src/pages/ProjectOutline.tsx` | Core Project |
| `/dashboard/tenant-tracker` | `TenantTracker` | `src/pages/TenantTracker.tsx` | Core Project |
| `/dashboard/drawings` | `DrawingRegister` | `src/pages/DrawingRegister.tsx` | Technical Design |
| `/dashboard/cable-schedules` | `CableSchedules` | `src/pages/CableSchedules.tsx` | Technical Design |
| `/dashboard/cable-schedules/:scheduleId` | `CableScheduleDetail` | `src/pages/CableScheduleDetail.tsx` | Technical Design |
| `/dashboard/bulk-services` | `BulkServices` | `src/pages/BulkServices.tsx` | Technical Design |
| `/dashboard/specifications` | `Specifications` | `src/pages/Specifications.tsx` | Technical Design |
| `/dashboard/specifications/:specId` | `SpecificationDetail` | `src/pages/SpecificationDetail.tsx` | Technical Design |
| `/dashboard/budgets/electrical` | `ElectricalBudgets` | `src/pages/ElectricalBudgets.tsx` | Technical Design |
| `/dashboard/budgets/electrical/:budgetId` | `ElectricalBudgetDetail` | `src/pages/ElectricalBudgetDetail.tsx` | Technical Design |
| `/dashboard/site-diary` | `SiteDiary` | `src/pages/SiteDiary.tsx` | Field Operations |
| `/dashboard/floor-plan` | `FloorPlan` | `src/pages/FloorPlan.tsx` | Field Operations |
| `/dashboard/boqs` | `BOQs` | `src/pages/BOQs.tsx` | Field Operations |
| `/dashboard/boqs/:boqId` | `BOQProjectDetail` | `src/pages/BOQProjectDetail.tsx` | Field Operations |
| `/dashboard/boq/:uploadId` | `BOQDetail` | `src/pages/BOQDetail.tsx` | Field Operations |
| `/dashboard/final-accounts` | `FinalAccounts` | `src/pages/FinalAccounts.tsx` | Field Operations |
| `/dashboard/final-accounts/:accountId` | `FinalAccountDetail` | `src/pages/FinalAccountDetail.tsx` | Field Operations |
| `/dashboard/procurement` | `Procurement` | `src/pages/Procurement.tsx` | Field Operations |
| `/dashboard/inspections` | `Inspections` | `src/pages/Inspections.tsx` | Field Operations |
| `/dashboard/db-legend-cards` | `DBLegendCards` | `src/pages/DBLegendCards.tsx` | Field Operations |
| `/dashboard/ai-tools` | `AITools` | `src/pages/AITools.tsx` | AI & Reports |
| `/dashboard/ai-skills` | `AISkills` | `src/pages/AISkills.tsx` | AI & Reports |
| `/dashboard/projects-report/generator` | `GeneratorReport` | `src/pages/GeneratorReport.tsx` | AI & Reports |
| `/dashboard/projects-report/lighting` | `LightingReport` | `src/pages/LightingReport.tsx` | AI & Reports |
| `/dashboard/cost-reports` | `CostReports` | `src/pages/CostReports.tsx` | AI & Reports |
| `/dashboard/cost-reports/:reportId` | `CostReportDetail` | `src/pages/CostReportDetail.tsx` | AI & Reports |
| `/dashboard/messages` | `Messages` | `src/pages/Messages.tsx` | Communication |
| `/dashboard/projects-report/handover` | `HandoverDocuments` | `src/pages/HandoverDocuments.tsx` | Communication |
| `/dashboard/project-settings` | `ProjectSettings` | `src/pages/ProjectSettings.tsx` | Settings |
| `/dashboard/contact-library` | `DashboardContactLibrary` | `src/pages/DashboardContactLibrary.tsx` | Settings |
| `/dashboard/master-library` | `MasterLibrary` | `src/pages/MasterLibrary.tsx` | Settings |

### Sidebar Configuration
Defined in `src/components/sidebar/sidebarConfig.ts` — organized into **5 workspace groups**:

| Group | Items |
|-------|-------|
| **Core Project** | Dashboard, Roadmap, Project Outline, Tenant Tracker |
| **Technical Design** | Drawing Register, Cable Schedules, Bulk Services, Specifications, Electrical Budget |
| **Field Operations** | Site Diary, Floor Plan, BOQ, Final Accounts, Procurement, Inspections, DB Legend Cards |
| **AI & Reports** | AI Tools, AI Skills, Generator Report, Lighting Report, Cost Reports |
| **Communication** | Messages, Handover Documents |
| **Settings** (bottom) | My Settings, Project Settings |

### DashboardLayout Guards (in order)
1. **Auth check** — `supabase.auth.getSession()` → if no session → redirect to `/auth`
2. **Project check** — reads `selectedProjectId` from `localStorage` → if missing → redirect to `/projects`
3. **Client contact check** — `useProjectClientCheck` hook → if project has no client contact assigned → blocks all pages except settings → shows prompt to assign client
4. **Password change** — reads `profiles.must_change_password` → if true → shows `FirstLoginModal` overlay (cannot dismiss)

---

## 5. Page-by-Page Breakdown

### 5.1 Landing Page (`/`)
**File:** `src/pages/Index.tsx`
**Purpose:** Marketing landing page showcasing platform features.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `AnimatedCounter` | `src/components/landing/AnimatedCounter.tsx` | Animated number counters for stats |
| `FeatureCard` | `src/components/landing/FeatureCard.tsx` | Feature highlight cards |
| `FloatingShapes` | `src/components/landing/FloatingShapes.tsx` | Background decorative animations |
| `StatsSection` | `src/components/landing/StatsSection.tsx` | Statistics display section |
**Flow:** CTA buttons → `/auth` (login/signup) or → `/projects` (if already authenticated)

### 5.2 Auth Page (`/auth`)
**File:** `src/pages/Auth.tsx`
**Purpose:** Authentication entry point.
**User Actions:**
1. **Login Tab:** Enter email + password → click "Sign In" → `supabase.auth.signInWithPassword()` → redirect to `/projects`
2. **Signup Tab:** Enter email + password → click "Sign Up" → `supabase.auth.signUp()` → shows "check email" message
3. **Forgot Password:** Click link → enter email → `supabase.auth.resetPasswordForEmail()` → sends reset email
**Error Handling:** Invalid credentials, email not confirmed, network errors → toast notification

### 5.3 Project Select (`/projects`)
**File:** `src/pages/ProjectSelect.tsx`
**Purpose:** List and select projects the user is a member of.
**Data Query:** `project_members` table joined to `projects` table, filtered by `auth.uid()`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateProjectDialog` | `src/components/CreateProjectDialog.tsx` | Create new project form (name, number, description, type, status) |
**User Actions:**
1. View list of projects with name, number, status
2. Click "Create Project" → dialog → fills form → inserts into `projects` table + adds current user as `project_members` with position 'owner'
3. Click a project card → stores `selectedProjectId` in `localStorage` → navigates to `/dashboard`

### 5.4 Dashboard (`/dashboard`)
**File:** `src/pages/Dashboard.tsx`
**Purpose:** Project overview with summary widgets.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `ProjectCompletionCard` | `src/components/dashboard/ProjectCompletionCard.tsx` | Overall project completion percentage |
| `DevelopmentRoadmapWidget` | `src/components/dashboard/DevelopmentRoadmapWidget.tsx` | Roadmap progress summary |
| `BulkServicesWidget` | `src/components/dashboard/BulkServicesWidget.tsx` | Bulk services progress |
| `TenantChangesWidget` | `src/components/dashboard/TenantChangesWidget.tsx` | Recent tenant modifications |
| `BeneficialOccupationWidget` | `src/components/dashboard/BeneficialOccupationWidget.tsx` | Beneficial occupation tracking |
| `IssuesIncompleteWidget` | `src/components/dashboard/IssuesIncompleteWidget.tsx` | Open issues/incomplete items |
| `StoicQuote` | `src/components/StoicQuote.tsx` | Motivational quote display |
**Data Sources:** Aggregates from `tenants`, `project_roadmap_items`, `cable_schedules`, `site_diary_tasks`, `bulk_services_documents`

### 5.5 Project Roadmap (`/dashboard/roadmap`)
**File:** `src/pages/ProjectRoadmap.tsx`
**Purpose:** Strategic milestone tracking with multiple views.
**Components:** `src/components/dashboard/roadmap/`
**Data Table:** `project_roadmap_items` — fields: `title`, `description`, `status` (not_started/in_progress/completed/blocked), `priority` (low/medium/high/critical), `phase`, `assigned_to`, `due_date`, `completed_at`, `external_link`, `roadmap_item_id` (link to parent)
**User Actions (Step by Step):**
1. **Create Item:** Click "Add Item" → enter title, description, phase, priority, assignee, due date → inserts into `project_roadmap_items`
2. **Kanban View:** Cards grouped by status columns → drag card between columns → updates `status` field
3. **Gantt View:** Horizontal timeline grouped by phase → shows duration bars
4. **Edit Item:** Click card → edit dialog → update fields
5. **Add Comment:** Open item → comment panel → enter comment → inserts into `project_roadmap_comments` → triggers `send-roadmap-comment-notification` if mentions detected
6. **Share Externally:** Click "Share" → generates token via `generate_client_portal_token()` → copies review link (`/roadmap-review/:token`) → sends invitation via `send-roadmap-share-invitation`
7. **Completion Streak:** When items are marked "completed" → `update_completion_streak()` trigger fires → updates `completion_streaks` table → can trigger `send-weekly-streak-summary`
8. **PDF Export:** Click "Export PDF" → generates roadmap PDF via SVG-PDF engine → downloads
**Related Routes:**
- `/dashboard/roadmap-review` — Internal review mode with scoring
- `/roadmap-review/:token` — External stakeholder review (read-only + comments)
- `/projects/:projectId/roadmap` — Deep link redirect to specific item
**Notifications:**
- `send-roadmap-assignment-notification` — When task assigned to user
- `send-roadmap-comment-notification` — When comment added
- `send-roadmap-completion-notification` — When milestone completed
- `send-roadmap-due-date-notification` — Due date reminders
- `send-roadmap-review-update` — When external reviewer adds feedback
- `send-roadmap-share-invitation` — When share link sent
- `process-roadmap-notifications` — Batch notification processing

### 5.6 Project Outline (`/dashboard/project-outline`)
**File:** `src/pages/ProjectOutline.tsx`
**Purpose:** High-level project description, scope, and structured documentation.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateProjectOutlineDialog` | `src/components/project-outline/CreateProjectOutlineDialog.tsx` | Create new outline |
| `ProjectOutlineHeader` | `src/components/project-outline/ProjectOutlineHeader.tsx` | Header with title and actions |
| `ProjectOutlineOverview` | `src/components/project-outline/ProjectOutlineOverview.tsx` | Overview tab content |
| `ProjectOutlineSections` | `src/components/project-outline/ProjectOutlineSections.tsx` | Sections editor |
| `AddSectionDialog` | `src/components/project-outline/AddSectionDialog.tsx` | Add new section |
| `TemplateSelector` | `src/components/project-outline/TemplateSelector.tsx` | Select from templates |
| `SaveAsTemplateDialog` | `src/components/project-outline/SaveAsTemplateDialog.tsx` | Save outline as reusable template |
| `ManageTemplatesDialog` | `src/components/project-outline/ManageTemplatesDialog.tsx` | Manage saved templates |
| `ProjectOutlineExportPDFButton` | `src/components/project-outline/ProjectOutlineExportPDFButton.tsx` | Export outline as PDF |
**User Actions:**
1. Create project outline → fill overview details
2. Add sections with content (rich text)
3. Save as template for reuse
4. Load from existing template
5. Export to PDF

### 5.7 Tenant Tracker (`/dashboard/tenant-tracker`)
**File:** `src/pages/TenantTracker.tsx`
**Purpose:** Core module for managing retail/commercial tenants within a building project.
**Components (48 total):**
| Component | File | Purpose |
|-----------|------|---------|
| `TenantOverview` | `TenantOverview.tsx` | Summary cards: total tenants, total load, average kW, status breakdown |
| `TenantList` | `TenantList.tsx` | Filterable/sortable table of all tenants |
| `TenantDialog` | `TenantDialog.tsx` | Create/edit tenant form (shop number, name, area, type, kW, status, deadlines) |
| `DeleteTenantDialog` | `DeleteTenantDialog.tsx` | Confirm tenant deletion |
| `AssignTenantDialog` | `AssignTenantDialog.tsx` | Assign tenant to user |
| `ImportTenantsDialog` | `ImportTenantsDialog.tsx` | Import tenants from Excel spreadsheet |
| `ImportTenantsFromBudget` | `ImportTenantsFromBudget.tsx` | Import tenants from electrical budget |
| `TenantDocumentsTab` | `TenantDocumentsTab.tsx` | Documents tab wrapper |
| `TenantDocumentManager` | `TenantDocumentManager.tsx` | Per-tenant document CRUD |
| `TenantDocumentStatusReport` | `TenantDocumentStatusReport.tsx` | Document status summary across all tenants |
| `UploadTenantDocumentDialog` | `UploadTenantDocumentDialog.tsx` | Upload document for tenant (13 document types) |
| `DocumentPreviewDialog` | `DocumentPreviewDialog.tsx` | Preview uploaded document |
| `GeneratorOverview` | `GeneratorOverview.tsx` | Generator sizing summary |
| `GeneratorSizingTable` | `GeneratorSizingTable.tsx` | Per-tenant generator sizing calculations |
| `GeneratorTenantList` | `GeneratorTenantList.tsx` | Tenant list for generator report |
| `GeneratorLoadingSettings` | `GeneratorLoadingSettings.tsx` | Load factor settings (25/50/75/100%) |
| `GeneratorCostSettingsDialog` | `GeneratorCostSettingsDialog.tsx` | Generator cost parameters (fuel, rental, maintenance) |
| `GeneratorCostingSection` | `GeneratorCostingSection.tsx` | Cost breakdown display |
| `GeneratorReportExportPDFButton` | `GeneratorReportExportPDFButton.tsx` | Export generator report PDF |
| `GeneratorSavedReportsList` | `GeneratorSavedReportsList.tsx` | List of saved generator reports |
| `CapitalRecoveryCalculator` | `CapitalRecoveryCalculator.tsx` | Capital cost recovery calculations |
| `RunningRecoveryCalculator` | `RunningRecoveryCalculator.tsx` | Running cost recovery calculations |
| `DBSizingRulesSettings` | `DBSizingRulesSettings.tsx` | Distribution board sizing rules editor |
| `DeadlineOverrideFields` | `DeadlineOverrideFields.tsx` | Override deadline dates per tenant |
| `KwOverrideAuditLog` | `KwOverrideAuditLog.tsx` | History of kW override changes |
| `TenantChangeAuditLog` | `TenantChangeAuditLog.tsx` | Full audit log of all tenant modifications |
| `TenantVersionBadge` | `TenantVersionBadge.tsx` | Shows current version number |
| `TenantNotificationSettings` | `TenantNotificationSettings.tsx` | Configure notifications for tenant changes |
| `TenantQCTab` | `TenantQCTab.tsx` | QC inspections tab |
| `TenantQCInspections` | `TenantQCInspections.tsx` | Quality control inspection records |
| `TenantReportGenerator` | `TenantReportGenerator.tsx` | Generate tenant schedule report |
| `TenantReportPreview` | `TenantReportPreview.tsx` | Preview report before export |
| `TenantOverviewImageExport` | `TenantOverviewImageExport.tsx` | Export overview as image |
| `FloorPlanMasking` | `FloorPlanMasking.tsx` | Floor plan area masking per tenant |
| `FloorPlanLegend` | `FloorPlanLegend.tsx` | Legend for floor plan view |
| `MaskingCanvas` | `MaskingCanvas.tsx` | Canvas component for masking |
| `MaskingToolbar` | `MaskingToolbar.tsx` | Toolbar for masking tools |
| `ScaleDialog` | `ScaleDialog.tsx` | Set floor plan scale |
| `LinkToHandoverDialog` | `LinkToHandoverDialog.tsx` | Link tenant to handover documents |
| `EditReportDialog` | `EditReportDialog.tsx` | Edit saved report |
| `ReportOptionsDialog` | `ReportOptionsDialog.tsx` | Report generation options |
| `ReportPreviewDialog` | `ReportPreviewDialog.tsx` | Preview generated report |
| `OutdatedReportsIndicator` | `OutdatedReportsIndicator.tsx` | Shows warning if report is outdated |
| `SavedReportsList` | `SavedReportsList.tsx` | List of saved reports |
| `GenerateLineShopBOQDialog` | `GenerateLineShopBOQDialog.tsx` | Generate line shop BOQ from tenants |
**Subdirectories:**
- `charts/` — Tenant data visualization charts
- `evaluation/` — Tenant evaluation components
- `utils/` — Tenant utility functions
**Document Types (13):** Electrical layout, Specification, Compliance certificate, Inspection report, As-built drawing, Test results, Warranty, Handover certificate, Snag list, Occupancy certificate, Fire clearance, Council approval, Other
**Key Triggers:**
| Trigger | Table | Purpose |
|---------|-------|---------|
| `log_tenant_change()` | `tenants` | On INSERT/UPDATE/DELETE → writes to `tenant_change_audit_log` with field-level diff, increments `tenant_schedule_versions`, queues notification |
| `log_kw_override_change()` | `tenants` | When `kw_override` field changes → writes to `tenant_kw_override_audit` with old/new values |
| `sync_tenant_document_status()` | `tenant_documents` | On INSERT/DELETE → updates tenant boolean flags (has_electrical_layout, has_specification, etc.) |
| `increment_tenant_schedule_version()` | `tenants` | Auto-increments version counter in `tenant_schedule_versions` |

### 5.8 Drawing Register (`/dashboard/drawings`)
**File:** `src/pages/DrawingRegister.tsx`
**Purpose:** Manage electrical engineering drawings with revision tracking and review workflow.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `DrawingRegisterPage` | `DrawingRegisterPage.tsx` | Main page layout |
| `DrawingTable` | `DrawingTable.tsx` | Table view of drawings |
| `DrawingGrid` | `DrawingGrid.tsx` | Grid/card view of drawings |
| `DrawingStatsCards` | `DrawingStatsCards.tsx` | Summary stats (total, by status, by discipline) |
| `AddDrawingDialog` | `AddDrawingDialog.tsx` | Add new drawing form |
| `EditDrawingDialog` | `EditDrawingDialog.tsx` | Edit existing drawing |
| `DrawingPreviewDialog` | `DrawingPreviewDialog.tsx` | Preview drawing file |
| `BulkImportDialog` | `BulkImportDialog.tsx` | Import drawings from Excel |
| `DropboxDrawingSync` | `DropboxDrawingSync.tsx` | Sync drawings from Dropbox |
| `SyncToRoadmapDialog` | `SyncToRoadmapDialog.tsx` | Create roadmap items from drawings |
**Subdirectories:**
- `admin/` — Admin review dashboard components
- `review/` — Drawing review workflow components
**Data Table:** `project_drawings` — fields: `drawing_number`, `drawing_title`, `discipline`, `status` (draft/for_review/approved/rejected/superseded), `current_revision`, `category` (auto-detected), `file_url`, `file_path`, `file_name`, `created_by`
**Auto-category:** `detect_drawing_category()` trigger → parses drawing number prefix → assigns category (electrical, mechanical, architectural, structural, fire, plumbing)
**Review Workflow:**
1. Author submits drawing for review → status changes to `for_review`
2. Reviewer receives `send-drawing-review-notification` email
3. Reviewer opens drawing → uses checklist (`useDrawingChecklists`) → approves or rejects
4. Author notified of result
**Dropbox Sync:** `sync-drawings` edge function → scans `/OFFICE/PROJECTS/[folder]/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST` → downloads new PDFs → uploads to storage → inserts into `project_drawings`

### 5.9 Cable Schedules (`/dashboard/cable-schedules`, `/dashboard/cable-schedules/:id`)
**Files:** `src/pages/CableSchedules.tsx`, `src/pages/CableScheduleDetail.tsx`
**Purpose:** Core electrical engineering tool for cable sizing, scheduling, cost tracking, and site verification.
**Components (30+):**
| Component | File | Purpose |
|-----------|------|---------|
| `CableSchedulesOverview` | `CableSchedulesOverview.tsx` | List of all cable schedules for project |
| `CreateCableScheduleDialog` | `CreateCableScheduleDialog.tsx` | Create new cable schedule |
| `CableScheduleOverview` | `CableScheduleOverview.tsx` | Summary stats for a single schedule |
| `CableEntriesManager` | `CableEntriesManager.tsx` | Main cable entries management |
| `AddCableEntryDialog` | `AddCableEntryDialog.tsx` | Add new cable entry form (tag, from, to, cable type, size, length, etc.) |
| `EditCableEntryDialog` | `EditCableEntryDialog.tsx` | Edit existing cable entry |
| `GroupedCableTable` | `GroupedCableTable.tsx` | Cables grouped by distribution board |
| `VirtualizedCableTable` | `VirtualizedCableTable.tsx` | Performance-optimized table for 500+ cables |
| `AllCableEntriesView` | `AllCableEntriesView.tsx` | Flat view of all cables |
| `CableTagSchedule` | `CableTagSchedule.tsx` | Cable tag reference schedule |
| `CableSizingReferenceView` | `CableSizingReferenceView.tsx` | Reference tables for cable sizing |
| `EditableCableSizingReference` | `EditableCableSizingReference.tsx` | Editable sizing reference data |
| `EditableCalculationSettings` | `EditableCalculationSettings.tsx` | Voltage drop %, derating factors |
| `TestCalculationSettings` | `TestCalculationSettings.tsx` | Test calculation parameters |
| `CableCalculationFormulas` | `CableCalculationFormulas.tsx` | Display calculation formulas used |
| `CableSizingOptimizer` | `CableSizingOptimizer.tsx` | Optimize cable sizes for cost/performance |
| `CableRatesManager` | `CableRatesManager.tsx` | Supply/install cost rates per cable type+size |
| `CableCostsSummary` | `CableCostsSummary.tsx` | Total material costs breakdown |
| `CableScheduleFilters` | `CableScheduleFilters.tsx` | Filter/search cables |
| `ImportExcelCableDialog` | `ImportExcelCableDialog.tsx` | Import cables from Excel |
| `ImportTenantsDialog` | `ImportTenantsDialog.tsx` | Import tenant destinations into cables |
| `ImportFloorPlanCablesDialog` | `ImportFloorPlanCablesDialog.tsx` | Import cables from floor plan markup |
| `SplitParallelCablesDialog` | `SplitParallelCablesDialog.tsx` | Split cable into parallel runs |
| `CableScheduleReports` | `CableScheduleReports.tsx` | Report generation options |
| `CableScheduleReportHistory` | `CableScheduleReportHistory.tsx` | History of generated reports |
| `CableScheduleExportPDFButton` | `CableScheduleExportPDFButton.tsx` | Export schedule as PDF |
| `SavedReportsList` | `SavedReportsList.tsx` | Saved reports |
| `ProjectSavedReportsList` | `ProjectSavedReportsList.tsx` | Project-level saved reports |
| `useCableFiltering` | `useCableFiltering.ts` | Hook for cable filtering logic |
**Subdirectory:** `verification/` — Cable verification portal components
**Cable Sizing Engine (`src/utils/cableSizing.ts`):**
- Input: load (kW/A), voltage, power factor, cable length, installation method, grouping, ambient temp
- Calculates: current-carrying capacity, voltage drop, short-circuit rating
- References: SANS 10142-1 tables for derating factors
- Output: recommended cable size, voltage drop %, compliance status
**Cable Optimization (`src/utils/cableOptimization.ts`):** Suggests optimal cable sizes balancing cost vs voltage drop
**Cable Validation (`src/utils/cableValidation.ts`):** Validates cable tags, location strings, size compatibility
**Validation Trigger:** `validate_cable_entry()` — rejects invalid cable tags and locations on INSERT/UPDATE
**Offline Sync:** `useCableOfflineSync` → stores entries in IndexedDB → syncs on reconnect

### 5.10 Bulk Services (`/dashboard/bulk-services`)
**File:** `src/pages/BulkServices.tsx`
**Purpose:** 6-phase workflow for utility-grade power supply applications.
**Architecture:** Two-row tab system — Row 1: 6 workflow phases, Row 2: individual steps/tasks within selected phase
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `BulkServicesOverview` | `BulkServicesOverview.tsx` | Overview/summary page |
| `BulkServicesHeader` | `BulkServicesHeader.tsx` | Page header with project context |
| `BulkServicesKPICard` | `BulkServicesKPICard.tsx` | KPI metric card |
| `BulkServicesSettingsOverview` | `BulkServicesSettingsOverview.tsx` | Settings panel |
| `BulkServicesSections` | `BulkServicesSections.tsx` | Section management |
| `BulkServicesSavedReportsList` | `BulkServicesSavedReportsList.tsx` | Saved reports |
| `BulkServicesExportPDFButton` | `BulkServicesExportPDFButton.tsx` | PDF export button |
| `BulkServicesDrawingMarkup` | `BulkServicesDrawingMarkup.tsx` | Drawing markup overlay |
| `CreateBulkServicesDialog` | `CreateBulkServicesDialog.tsx` | Create new document |
| `ClimaticZoneMap` | `ClimaticZoneMap.tsx` | Mapbox map for climatic zone selection |
| `ClimaticZoneStrip` | `ClimaticZoneStrip.tsx` | Climatic zone display strip |
| `StaticZoneDisplay` | `StaticZoneDisplay.tsx` | Static zone info display |
| `ZoneStatisticsChart` | `ZoneStatisticsChart.tsx` | Zone statistics visualization |
| `SANS204Calculator` | `SANS204Calculator.tsx` | SANS 204 load calculator |
| `CalculationTutorial` | `CalculationTutorial.tsx` | Step-by-step calculation tutorial |
| `LoadClarificationSection` | `LoadClarificationSection.tsx` | Load clarification form |
| `TariffSelector` | `TariffSelector.tsx` | Tariff structure selection |
| `SatelliteMarkup` | `SatelliteMarkup.tsx` | Satellite view markup |
**Phase Components:**
| Phase | Component | File | Purpose |
|-------|-----------|------|---------|
| 1 | `Phase1LoadEstimation` | `phases/Phase1LoadEstimation.tsx` | Load estimation workflow |
| 2 | `Phase2BulkRequirements` | `phases/Phase2BulkRequirements.tsx` | Bulk requirements definition |
| 3 | `Phase3UtilityApplication` | `phases/Phase3UtilityApplication.tsx` | Utility application forms |
| 4 | `Phase4DesignApproval` | `phases/Phase4DesignApproval.tsx` | Design & approval tracking |
| 5 | `Phase5Construction` | `phases/Phase5Construction.tsx` | Construction phase tracking |
| 6 | `Phase6Operation` | `phases/Phase6Operation.tsx` | Operations phase tracking |
| — | `PhaseSummaryHeader` | `phases/PhaseSummaryHeader.tsx` | Persistent header: Connected Load, Max Demand, Voltage |
| — | `PhaseContentWrapper` | `phases/PhaseContentWrapper.tsx` | Phase content wrapper |
| — | `PhaseStepContainer` | `phases/PhaseStepContainer.tsx` | Step container |
| — | `PhaseStepTabs` | `phases/PhaseStepTabs.tsx` | Step tab navigation |
| — | `PhaseTaskList` | `phases/PhaseTaskList.tsx` | Task list per phase |
| — | `WorkflowSummary` | `phases/WorkflowSummary.tsx` | Overall workflow summary |
| — | `StepContentRegistry` | `phases/steps/StepContentRegistry.tsx` | Maps tasks to data entry forms |
**Phase 1 Sub-components:**
| Component | File | Purpose |
|-----------|------|---------|
| `LoadEntryModeSelector` | `phase1/LoadEntryModeSelector.tsx` | Choose load entry method |
| `LoadMethodSelector` | `phase1/LoadMethodSelector.tsx` | Select calculation method |
| `LoadScheduleTable` | `phase1/LoadScheduleTable.tsx` | Load schedule data table |
| `LoadCalculationSummary` | `phase1/LoadCalculationSummary.tsx` | Summary of calculated loads |
| `CategoryTotalsCard` | `phase1/CategoryTotalsCard.tsx` | Category-based load totals |
| `ElectricalStandardsCard` | `phase1/ElectricalStandardsCard.tsx` | SANS standards reference |
| `FutureExpansionCard` | `phase1/FutureExpansionCard.tsx` | Future expansion factor settings |
| `SANS10142LoadCalculator` | `phase1/SANS10142LoadCalculator.tsx` | SANS 10142 calculation form |
| `SANS204LoadCalculator` | `phase1/SANS204LoadCalculator.tsx` | SANS 204 calculation form |
| `ADMDResidentialCalculator` | `phase1/ADMDResidentialCalculator.tsx` | ADMD residential calculation |
| `TypicalValuesReference` | `phase1/TypicalValuesReference.tsx` | Typical load values reference table |
**Step Content (per phase):** `phases/steps/phase1/` through `phases/steps/phase6/` — task-specific data entry forms with bi-directional sync to project modules (Cable Schedule, BOQ)
**Workflow Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `WorkflowDashboard` | `workflow/WorkflowDashboard.tsx` | Overall workflow progress dashboard |
| `WorkflowPhaseCard` | `workflow/WorkflowPhaseCard.tsx` | Individual phase progress card |
| `useWorkflowInitializer` | `workflow/useWorkflowInitializer.ts` | Initialize workflow phases and tasks from template |
| `useTaskAutoSync` | `workflow/useTaskAutoSync.ts` | Auto-sync task status with project data |
| `workflowTemplate` | `workflow/workflowTemplate.ts` | Phase/task template definition |

### 5.11 Specifications (`/dashboard/specifications`, `/dashboard/specifications/:id`)
**Files:** `src/pages/Specifications.tsx`, `src/pages/SpecificationDetail.tsx`
**Purpose:** Technical specification document management.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateSpecificationDialog` | `CreateSpecificationDialog.tsx` | Create new specification |
| `SpecificationOverview` | `SpecificationOverview.tsx` | Specification summary |
| `SpecificationSections` | `SpecificationSections.tsx` | Section editor |
| `SpecificationTerms` | `SpecificationTerms.tsx` | Terms and conditions |
| `SpecificationExportPDFButton` | `SpecificationExportPDFButton.tsx` | Export as PDF |

### 5.12 Electrical Budget (`/dashboard/budgets/electrical`, `/dashboard/budgets/electrical/:id`)
**Files:** `src/pages/ElectricalBudgets.tsx`, `src/pages/ElectricalBudgetDetail.tsx`
**Purpose:** Detailed electrical cost budgeting with hierarchical sections and line items.
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateBudgetDialog` | `CreateBudgetDialog.tsx` | Create new budget |
| `BudgetOverview` | `BudgetOverview.tsx` | Budget summary with totals |
| `BudgetSectionsManager` | `BudgetSectionsManager.tsx` | Manage budget sections |
| `BudgetSectionCard` | `BudgetSectionCard.tsx` | Individual section display |
| `AddSectionDialog` | `AddSectionDialog.tsx` | Add new section |
| `AddLineItemDialog` | `AddLineItemDialog.tsx` | Add line item to section |
| `EditLineItemDialog` | `EditLineItemDialog.tsx` | Edit existing line item |
| `BudgetReferenceDrawings` | `BudgetReferenceDrawings.tsx` | Attach reference drawings |
| `BudgetPdfUpload` | `BudgetPdfUpload.tsx` | Upload budget PDF for extraction |
| `BudgetExtractionReview` | `BudgetExtractionReview.tsx` | Review AI-extracted budget data |
| `BudgetBaselineAllowances` | `BudgetBaselineAllowances.tsx` | Baseline allowance settings |
| `BudgetExclusions` | `BudgetExclusions.tsx` | Budget exclusions list |
| `AreaScheduleSync` | `AreaScheduleSync.tsx` | Sync areas from tenant schedule |
| `ElectricalBudgetExportPDFButton` | `ElectricalBudgetExportPDFButton.tsx` | Export budget as PDF |
| `ElectricalBudgetReportHistory` | `ElectricalBudgetReportHistory.tsx` | Report history |
| `ElectricalBudgetReportPreview` | `ElectricalBudgetReportPreview.tsx` | Report preview |
**Data Structure:** `electrical_budgets` → `budget_sections` (code, name) → `budget_line_items` (description, quantity, area, base_rate, supply_rate, install_rate, total, master_material_id, master_rate_id, tenant_id)
**Features:**
- Line items can link to `master_materials` for standard rates
- Line items can link to `master_rate_library` for rate benchmarking
- Tenant-specific items tagged with `tenant_id` and `shop_number`
- Area-based calculations (rate × area = total)
- Reference drawing uploads to `budget_reference_drawings`
- Offline sync via `useBudgetOfflineSync`

### 5.13 Site Diary (`/dashboard/site-diary`)
**File:** `src/pages/SiteDiary.tsx`
**Purpose:** Daily construction task management and progress tracking.
**Components:**
| Component | Directory/File | Purpose |
|-----------|---------------|---------|
| `TasksManager` | `TasksManager.tsx` | Main task CRUD |
| `MeetingMinutes` | `MeetingMinutes.tsx` | Meeting minutes recording |
| `RemindersPanel` | `RemindersPanel.tsx` | Reminders and due dates |
| `TasksGanttChart` | `TasksGanttChart.tsx` | Gantt chart view |
| Board components | `board/` | Kanban board view (drag & drop via @dnd-kit) |
| Dashboard components | `dashboard/` | Site diary dashboard widgets |
| Entry form | `entry-form/` | Task entry form components |
| Gantt components | `gantt/` | Gantt chart sub-components |
| Overview | `overview/` | Overview statistics |
| Task views | `task-views/` | Different task display modes |
**User Actions:**
1. Create task → title, description, status, priority, assignee, due date, roadmap item link
2. Kanban view → drag tasks between status columns (todo/in-progress/done)
3. Gantt view → see timeline with roadmap phase grouping
4. Meeting minutes → record meeting notes with date and attendees
5. Reminders → set reminders for upcoming tasks
**Triggers:** `notify_task_assignment()` → sends notification when task assigned
**Offline:** `useOfflineSiteDiary` → IndexedDB offline queue

### 5.14 Floor Plan Markup (`/dashboard/floor-plan`)
**File:** `src/pages/FloorPlan.tsx`
**Purpose:** Interactive floor plan annotation and cable route visualization.
**Components:**
| Directory | Purpose |
|-----------|---------|
| `components/` | Floor plan sub-components (toolbar, layers, equipment palette) |
| `hooks/` | Floor plan hooks (canvas state, zoom, selection) |
| `utils/` | Floor plan utilities (coordinate math, export) |
| `App.tsx` | Main floor plan application component |
| `constants.ts` | Equipment symbols, colors, sizes |
| `types.ts` | TypeScript interfaces for floor plan data |
| `purpose.config.ts` | Configuration for floor plan purpose |
**Features:**
- Fabric.js canvas for drawing/annotation
- Standard electrical equipment symbols (lights, switches, outlets, DBs)
- Cable route drawing with path tools
- Tenant area masking (highlight per tenant)
- Scale calibration (set pixels-to-meters ratio)
- Pan/zoom controls (react-zoom-pan-pinch)
- Import cables from floor plan into cable schedules
- Export as image (html2canvas)

### 5.15 BOQ (Bill of Quantities)
**Routes:** `/dashboard/boqs`, `/dashboard/boqs/:boqId`, `/dashboard/boq/:uploadId`
**Files:** `src/pages/BOQs.tsx`, `src/pages/BOQProjectDetail.tsx`, `src/pages/BOQDetail.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `BOQOverview` | `BOQOverview.tsx` | BOQ overview/summary |
| `BOQBillsManager` | `BOQBillsManager.tsx` | Manage bills within a BOQ |
| `BOQProjectSectionsManager` | `BOQProjectSectionsManager.tsx` | Manage sections within a bill |
| `BOQItemsSpreadsheetTable` | `BOQItemsSpreadsheetTable.tsx` | Spreadsheet-style item editor |
| `BOQSpreadsheetTable` | `BOQSpreadsheetTable.tsx` | Alternative spreadsheet view |
| `AddBOQBillDialog` | `AddBOQBillDialog.tsx` | Add new bill |
| `AddBOQSectionDialog` | `AddBOQSectionDialog.tsx` | Add new section |
| `BOQSectionTemplatePicker` | `BOQSectionTemplatePicker.tsx` | Pick from standard section templates |
| `BOQExcelImportDialog` | `BOQExcelImportDialog.tsx` | Import from Excel |
| `BOQExcelExportButton` | `BOQExcelExportButton.tsx` | Export to Excel |
| `BOQProcessingWizard` | `BOQProcessingWizard.tsx` | Multi-step import processing wizard |
| `LineShopTemplatesGrid` | `LineShopTemplatesGrid.tsx` | Line shop template grid view |
| Wizard components | `wizard/` | Step-by-step import wizard components |
**Data Hierarchy:** `project_boqs` → `boq_bills` (number, name) → `boq_project_sections` (code, name) → `boq_items` (code, description, quantity, unit, supply_rate, install_rate, total_rate, total_amount, item_type)
**Item Types:** `quantity` (standard), `prime_cost` (PC sum), `percentage` (% of reference item), `sub_header` (section header)
**Calculation Triggers:**
| Trigger | Purpose |
|---------|---------|
| `calculate_boq_item_amount()` | item total = quantity × total_rate |
| `calculate_boq_item_costs()` | supply_cost = quantity × supply_rate, install_cost = quantity × install_rate |
| `update_boq_section_totals()` | Section total = sum of item totals |
| `update_boq_bill_totals()` | Bill total = sum of section totals |
| `update_project_boq_total()` | Project BOQ total = sum of bill totals |
**AI Extraction:** Upload Excel/PDF → `extract-boq-rates` edge function → AI parses items → `boq_extracted_items` table → `match-boq-rates` edge function → matches to `master_materials` with confidence scoring → user reviews and approves

### 5.16 Final Accounts (`/dashboard/final-accounts`, `/dashboard/final-accounts/:id`)
**Files:** `src/pages/FinalAccounts.tsx`, `src/pages/FinalAccountDetail.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateFinalAccountDialog` | `CreateFinalAccountDialog.tsx` | Create new final account |
| `FinalAccountOverview` | `FinalAccountOverview.tsx` | Summary with contract vs final totals |
| `FinalAccountBillsManager` | `FinalAccountBillsManager.tsx` | Manage bills |
| `FinalAccountSectionsManager` | `FinalAccountSectionsManager.tsx` | Manage sections |
| `FinalAccountItemsTable` | `FinalAccountItemsTable.tsx` | Items table with contract/final columns |
| `SpreadsheetItemsTable` | `SpreadsheetItemsTable.tsx` | Spreadsheet-style editing |
| `PCSpreadsheetTable` | `PCSpreadsheetTable.tsx` | Prime Cost spreadsheet |
| `PSSpreadsheetTable` | `PSSpreadsheetTable.tsx` | Provisional Sum spreadsheet |
| `AddBillDialog` | `AddBillDialog.tsx` | Add bill |
| `AddSectionDialog` | `AddSectionDialog.tsx` | Add section |
| `AddItemDialog` | `AddItemDialog.tsx` | Add item |
| `ImportBOQDialog` | `ImportBOQDialog.tsx` | Import from project BOQ |
| `UnifiedBOQImport` | `UnifiedBOQImport.tsx` | Unified BOQ import flow |
| `FinalAccountExcelImport` | `FinalAccountExcelImport.tsx` | Import from Excel |
| `FinalAccountExportPDFButton` | `FinalAccountExportPDFButton.tsx` | Export as PDF |
| `BOQReconciliationDialog` | `BOQReconciliationDialog.tsx` | Reconcile with BOQ |
| `BOQDiscrepanciesSummary` | `BOQDiscrepanciesSummary.tsx` | Show discrepancies |
| `ItemHistoryDialog` | `ItemHistoryDialog.tsx` | Item change history |
| `CommentsPanel` | `CommentsPanel.tsx` | Comments on final account |
| `ItemCommentsPanel` | `ItemCommentsPanel.tsx` | Comments on individual items |
| `SectionCommentsPanel` | `SectionCommentsPanel.tsx` | Comments on sections |
| `PrimeCostManager` | `PrimeCostManager.tsx` | Prime cost management |
| `PrimeCostBreakdown` | `PrimeCostBreakdown.tsx` | Prime cost breakdown |
| `PrimeCostDocuments` | `PrimeCostDocuments.tsx` | Prime cost supporting documents |
| `LineShopsManager` | `LineShopsManager.tsx` | Line shop management |
| `ReferenceDrawingsManager` | `ReferenceDrawingsManager.tsx` | Reference drawings |
| `QuickSetupWizard` | `QuickSetupWizard.tsx` | Quick setup wizard for new accounts |
| `SendForReviewDialog` | `SendForReviewDialog.tsx` | Send for external review |
| `ReviewWalkthrough` | `ReviewWalkthrough.tsx` | Guided review walkthrough |
| `ReviewerCredentialsForm` | `ReviewerCredentialsForm.tsx` | Reviewer identity form |
| `SectionReviewStatusBadge` | `SectionReviewStatusBadge.tsx` | Review status indicator |
| `CelebrationOverlay` | `CelebrationOverlay.tsx` | Confetti on completion |
| `sectionTemplates.ts` | | Default section template definitions |
**Audit Trigger:** `log_final_account_item_change()` → on INSERT/UPDATE/DELETE → writes to `final_account_item_history` with operation type, old values, new values, changed_by
**Cascading Totals:** `update_bill_totals()` → recalculates section → bill → account totals

### 5.17 Cost Reports (`/dashboard/cost-reports`, `/dashboard/cost-reports/:id`)
**Files:** `src/pages/CostReports.tsx`, `src/pages/CostReportDetail.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `CreateCostReportDialog` | `CreateCostReportDialog.tsx` | Create new cost report |
| `CostReportOverview` | `CostReportOverview.tsx` | Report summary (Original Budget, Previous, Anticipated Final) |
| `CostCategoriesManager` | `CostCategoriesManager.tsx` | Manage cost categories |
| `CategoryCard` | `CategoryCard.tsx` | Individual category display |
| `AddCategoryDialog` | `AddCategoryDialog.tsx` | Add cost category |
| `EditCategoryDialog` | `EditCategoryDialog.tsx` | Edit cost category |
| `LineItemRow` | `LineItemRow.tsx` | Individual line item row |
| `AddLineItemDialog` | `AddLineItemDialog.tsx` | Add line item |
| `EditLineItemDialog` | `EditLineItemDialog.tsx` | Edit line item |
| `CostVariationsManager` | `CostVariationsManager.tsx` | Manage variations (credits/debits) |
| `AddVariationDialog` | `AddVariationDialog.tsx` | Add variation |
| `EditVariationDialog` | `EditVariationDialog.tsx` | Edit variation |
| `VariationSheetDialog` | `VariationSheetDialog.tsx` | Variation sheet view |
| `CostReportHistory` | `CostReportHistory.tsx` | Report revision history |
| `CompareReportsDialog` | `CompareReportsDialog.tsx` | Compare two report revisions side-by-side |
| `CoverPageManager` | `CoverPageManager.tsx` | Cover page configuration |
| `ReportDetailsManager` | `ReportDetailsManager.tsx` | Report metadata |
| `ImportExcelDialog` | `ImportExcelDialog.tsx` | Import from Excel |
| `ExcelImportGuide` | `ExcelImportGuide.tsx` | Guide for Excel format |
| `PDFExportSettings` | `PDFExportSettings.tsx` | PDF export configuration |
| `SvgPdfExportButton` | `SvgPdfExportButton.tsx` | Export via SVG-PDF engine |
| `ValidationWarningDialog` | `ValidationWarningDialog.tsx` | Validation warnings before export |
**PDF Export sub-system:** `pdf-export/` directory with:
- `components/` — PDF rendering components
- `hooks/` — PDF export hooks
- `sections/` — PDF section renderers
- `utils/` — PDF utility functions
- `types.ts` — PDF type definitions
**Report Structure:** 3 financial columns: Original Budget → Previous Report → Anticipated Final Cost
**Variation Tracking:** Each variation has: description, amount (positive=debit, negative=credit), category, status (pending/approved/rejected)
**Audit:** `log_variation_change()` trigger → `cost_variation_history` table

### 5.18 Procurement (`/dashboard/procurement`)
**File:** `src/pages/Procurement.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `ProcurementItemsTable` | `ProcurementItemsTable.tsx` | Procurement items table with status tracking |
**Project Settings Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `AddProcurementItemDialog` | `src/components/project-settings/AddProcurementItemDialog.tsx` | Add procurement item |
| `EditProcurementItemDialog` | `src/components/project-settings/EditProcurementItemDialog.tsx` | Edit procurement item |
| `ProcurementTrackingSettings` | `src/components/project-settings/ProcurementTrackingSettings.tsx` | Procurement tracking configuration |
**Status Flow:** requested → quoted → ordered → shipped → delivered → installed
**Triggers:**
| Trigger | Purpose |
|---------|---------|
| `log_procurement_status_change()` | Audit trail for status changes |
| `create_procurement_roadmap_item()` | Auto-creates roadmap item when procurement item created |
| `sync_procurement_to_roadmap()` | Marks roadmap item complete when procurement status = delivered/installed |

### 5.19 Inspections (`/dashboard/inspections`)
**File:** `src/pages/Inspections.tsx`
**Components:** `src/components/procurement/inspections/`
**Purpose:** Quality control and compliance inspection management, linked to procurement items

### 5.20 DB Legend Cards (`/dashboard/db-legend-cards`)
**File:** `src/pages/DBLegendCards.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `DBLegendCardsDashboard` | `DBLegendCardsDashboard.tsx` | Admin dashboard for all legend cards |
| `LegendCardDetailViewer` | `LegendCardDetailViewer.tsx` | Detailed card viewer with circuit/contactor data |
| `LegendCardReportHistory` | `LegendCardReportHistory.tsx` | Report history for legend cards |
**Contractor Portal Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `ContractorDBLegendCards` | `src/components/contractor-portal/ContractorDBLegendCards.tsx` | Contractor view/submit |
| `DBLegendCardForm` | `src/components/contractor-portal/DBLegendCardForm.tsx` | Card creation form |
| `DBLegendCardSubmitDialog` | `src/components/contractor-portal/DBLegendCardSubmitDialog.tsx` | Submit confirmation |
**Workflow:** Draft → Submitted (triggers `send-legend-card-notification`) → Approved/Rejected (batch actions available)

### 5.21 Generator Report (`/dashboard/projects-report/generator`)
**File:** `src/pages/GeneratorReport.tsx`
**Purpose:** Standby generator system implementation report.
**Report Structure:** Cover → List of Terms → TOC → 5 Narrative Engineering Sections → Appendices (A: Capital Cost, B: Operational Recovery, C: Load Allocation)
**Components:** See Tenant Tracker section (Generator* components)
**Additional Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `ShareGeneratorReportDialog` | `src/components/generator/ShareGeneratorReportDialog.tsx` | Share report via token link |
| `GeneratorShareHistory` | `src/components/generator/GeneratorShareHistory.tsx` | History of shared reports |
**Calculation Engine (`src/utils/generatorSizing.ts`):**
- Input: tenant loads, load factor (25/50/75/100%), cost parameters
- Calculates: total connected load, diversified demand, recommended generator size
- Cost calculations: fuel consumption, rental costs, maintenance intervals
- `maintenanceCostAnnual` = cost per 250-hour service interval (not total annual)
**Sharing:** `send-generator-report-share` edge function → generates token link → `/generator-report/:token`

### 5.22 Lighting Report (`/dashboard/projects-report/lighting`)
**File:** `src/pages/LightingReport.tsx`
**Components:**
| Component | Directory | Purpose |
|-----------|-----------|---------|
| `LightingOverview` | `lighting/LightingOverview.tsx` | Overview tab |
| `LightingLibraryTab` | `lighting/LightingLibraryTab.tsx` | Lighting fittings library |
| `AddFittingDialog` | `lighting/AddFittingDialog.tsx` | Add lighting fitting |
| `ImportFittingsDialog` | `lighting/ImportFittingsDialog.tsx` | Import fittings from file |
| Advanced features | `lighting/advanced/` | Advanced analysis tab |
| Analytics | `lighting/analytics/` | Lighting analytics |
| Comparison | `lighting/comparison/` | Compare lighting options |
| Data | `lighting/data/` | Reference data |
| Floor plan | `lighting/floorplan/` | Lighting floor plan overlay |
| Handover | `lighting/handover/` | Lighting handover documents |
| Photometric | `lighting/photometric/` | Photometric analysis |
| Recommendations | `lighting/recommendations/` | AI recommendations |
| Reports | `lighting/reports/` | Report generation |
| Schedule | `lighting/schedule/` | Lighting schedule |
| Spec sheets | `lighting/specsheets/` | Specification sheets |
| Suppliers | `lighting/suppliers/` | Supplier database |
| Sustainability | `lighting/sustainability/` | Energy sustainability |
| Visualization | `lighting/visualization/` | Light visualization |
**Edge Functions:** `lighting-recommendations`, `lighting-insights`, `extract-lighting-specs`

### 5.23 AI Tools (`/dashboard/ai-tools`)
**File:** `src/pages/AITools.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `EngineeringChatbot` | `EngineeringChatbot.tsx` | AI chat interface for engineering Q&A |
| `DataAnalyzer` | `DataAnalyzer.tsx` | Analyze project data with AI |
| `CostPredictor` | `CostPredictor.tsx` | AI cost prediction |
| `DocumentGenerator` | `DocumentGenerator.tsx` | AI document generation |
| `KnowledgeBaseManager` | `KnowledgeBaseManager.tsx` | Upload/manage knowledge documents |
| `KnowledgeSearchTester` | `KnowledgeSearchTester.tsx` | Test knowledge base search |
| `DocumentChunkPreview` | `DocumentChunkPreview.tsx` | Preview document chunks |

### 5.24 AI Skills (`/dashboard/ai-skills`)
**File:** `src/pages/AISkills.tsx`
**Components:** `src/components/ai-skills/`
**Data Table:** `ai_skills` — fields: `name`, `description`, `instructions`, `category`, `icon`, `is_active`, `is_system`, `version`

### 5.25 Messages (`/dashboard/messages`)
**File:** `src/pages/Messages.tsx`
**Components (37 total):**
| Component | File | Purpose |
|-----------|------|---------|
| `ConversationsList` | `ConversationsList.tsx` | Left panel: list of conversations |
| `ChatWindow` | `ChatWindow.tsx` | Right panel: message display and composer |
| `MessageComposer` | `MessageComposer.tsx` | Message input with rich text, file attach, voice record |
| `MessageBubble` | `MessageBubble.tsx` | Individual message display |
| `MessageActions` | `MessageActions.tsx` | Reply, edit, delete, forward, pin, react |
| `MessageReactions` | `MessageReactions.tsx` | Emoji reactions on messages |
| `EmojiPicker` | `EmojiPicker.tsx` | Emoji selection UI |
| `ReactionsAnalytics` | `ReactionsAnalytics.tsx` | Reaction usage analytics |
| `MessageSearch` | `MessageSearch.tsx` | Search through messages |
| `MessageTemplates` | `MessageTemplates.tsx` | Reusable message templates (`/shortcut` trigger) |
| `MessageTranslation` | `MessageTranslation.tsx` | Translate messages |
| `MessageStatusIndicator` | `MessageStatusIndicator.tsx` | Sent/delivered/read indicator |
| `DeliveryStatus` | `DeliveryStatus.tsx` | Delivery status display |
| `ReadReceipts` | `ReadReceipts.tsx` | Read receipt viewer |
| `TypingIndicator` | `TypingIndicator.tsx` | "User is typing..." indicator |
| `MentionsAutocomplete` | `MentionsAutocomplete.tsx` | @mention user autocomplete |
| `ThreadView` | `ThreadView.tsx` | Message thread/reply view |
| `PinnedMessages` | `PinnedMessages.tsx` | Pinned messages list |
| `StarredMessages` | `StarredMessages.tsx` | Starred messages list |
| `VoiceRecorder` | `VoiceRecorder.tsx` | Voice message recording |
| `RichTextEditor` | `RichTextEditor.tsx` | Rich text message editor (TipTap) |
| `FilePreview` | `FilePreview.tsx` | Attached file preview |
| `LinkPreview` | `LinkPreview.tsx` | URL link preview |
| `NewConversationDialog` | `NewConversationDialog.tsx` | Create new conversation |
| `EditMessageDialog` | `EditMessageDialog.tsx` | Edit sent message |
| `ForwardMessageDialog` | `ForwardMessageDialog.tsx` | Forward message to another conversation |
| `ScheduleMessageDialog` | `ScheduleMessageDialog.tsx` | Schedule message for later |
| `ScheduledMessagesList` | `ScheduledMessagesList.tsx` | View scheduled messages |
| `MessageReminder` | `MessageReminder.tsx` | Set reminder on message |
| `MessageRemindersList` | `MessageRemindersList.tsx` | View message reminders |
| `ConversationLabels` | `ConversationLabels.tsx` | Label/tag conversations |
| `ConversationArchive` | `ConversationArchive.tsx` | Archive conversations |
| `MuteConversation` | `MuteConversation.tsx` | Mute notification settings |
| `ExportConversation` | `ExportConversation.tsx` | Export conversation as PDF/text |
| `PushNotificationToggle` | `PushNotificationToggle.tsx` | Enable/disable push notifications |
| `OfflineQueueStatus` | `OfflineQueueStatus.tsx` | Show offline message queue status |
| `MessageNotificationBell` | `MessageNotificationBell.tsx` | Header notification bell |
**Realtime:** Messages table has `supabase_realtime` publication → live message delivery
**Hooks:** `useConversations`, `useMessages`, `useUnreadMessages`, `useTypingIndicator`, `useDraftMessage`, `useOfflineMessageQueue`

### 5.26 Handover Documents (`/dashboard/projects-report/handover`)
**File:** `src/pages/HandoverDocuments.tsx`
**Components:**
| Component | File | Purpose |
|-----------|------|---------|
| `HandoverDashboard` | `HandoverDashboard.tsx` | Overview with completion stats |
| `HandoverDocumentsList` | `HandoverDocumentsList.tsx` | Document list with folder navigation |
| `HandoverTenantsList` | `HandoverTenantsList.tsx` | Per-tenant handover status |
| `UploadHandoverDocumentDialog` | `UploadHandoverDocumentDialog.tsx` | Upload document |
| `LinkHandoverDocumentDialog` | `LinkHandoverDocumentDialog.tsx` | Link document to tenant |
| `DocumentSearchFilters` | `DocumentSearchFilters.tsx` | Search and filter |
| `DocumentTypeChart` | `DocumentTypeChart.tsx` | Document type distribution chart |
| `TenantProgressIndicator` | `TenantProgressIndicator.tsx` | Per-tenant completion gauge |
| `TenantDocumentUpload` | `TenantDocumentUpload.tsx` | Tenant-specific upload |
| `TenantCompletionExportPDFButton` | `TenantCompletionExportPDFButton.tsx` | Export completion report |
| `ClientDocumentPreview` | `ClientDocumentPreview.tsx` | Client-facing preview |
| `RecentActivityTimeline` | `RecentActivityTimeline.tsx` | Recent upload activity |
| `AsBuiltDrawingsView` | `AsBuiltDrawingsView.tsx` | As-built drawings section |
| `BulkUploadAsBuiltDialog` | `BulkUploadAsBuiltDialog.tsx` | Bulk upload as-built drawings |
| `EquipmentDocumentsView` | `EquipmentDocumentsView.tsx` | Equipment documents section |
| `GeneralDocumentsView` | `GeneralDocumentsView.tsx` | General documents section |
| `SANS10142ComplianceChecklist` | `SANS10142ComplianceChecklist.tsx` | SANS 10142-1 compliance checklist |
| Folder components | `folders/` | Folder hierarchy management |
**Trigger:** `update_folder_path()` → maintains full folder path on parent changes

### 5.27–5.29 Settings Pages
**Project Settings (`/dashboard/project-settings`):**
| Component | File | Purpose |
|-----------|------|---------|
| `ContractorPortalSettings` | `ContractorPortalSettings.tsx` | Configure contractor portal tokens |
| `ProcurementTrackingSettings` | `ProcurementTrackingSettings.tsx` | Procurement configuration |
| `ReportAutomationSettings` | `ReportAutomationSettings.tsx` | Automated report settings |
| `TokenNotificationContacts` | `TokenNotificationContacts.tsx` | Configure notification recipients for portal tokens |
| Report automation | `report-automation/` | Report automation sub-components |

**User Settings (`/settings`):**
| Component | File | Purpose |
|-----------|------|---------|
| `AvatarUpload` | `AvatarUpload.tsx` | Profile picture upload |
| `CompanySettings` | `CompanySettings.tsx` | Company information |
| `CloudStorageSettings` | `CloudStorageSettings.tsx` | Dropbox/cloud storage connection |
| `InvoiceSettings` | `InvoiceSettings.tsx` | Invoice configuration |
| `NotificationPreferencesSettings` | `NotificationPreferencesSettings.tsx` | Notification opt-in/out |
| `PDFExportSettings` | `PDFExportSettings.tsx` | PDF export preferences |
| `PWASettings` | `PWASettings.tsx` | PWA install/update settings |
| `SessionSecuritySettings` | `SessionSecuritySettings.tsx` | Session timeout, security |
| `ProjectContacts` | `ProjectContacts.tsx` | Project contacts management |
| `ProjectMembers` | `ProjectMembers.tsx` | Project member management |
| `GlobalContactsManager` | `GlobalContactsManager.tsx` | Global contacts |
| `TemplateManager` | `TemplateManager.tsx` | Document templates |
| `TemplatePlaceholderReference` | `TemplatePlaceholderReference.tsx` | Template placeholder reference guide |
| `CostReportTemplateGenerator` | `CostReportTemplateGenerator.tsx` | Cost report template builder |
| `WordDocumentEditor` | `WordDocumentEditor.tsx` | Word document template editor |

---

## 6. Component Architecture — Full Inventory

### Top-Level Components
| Component | File | Purpose |
|-----------|------|---------|
| `App.tsx` | `src/App.tsx` | Provider tree + router |
| `AppSidebar` | `src/components/AppSidebar.tsx` | Dashboard sidebar navigation |
| `AdminSidebar` | `src/components/AdminSidebar.tsx` | Admin sidebar navigation |
| `ProjectDropdown` | `src/components/ProjectDropdown.tsx` | Quick project switching dropdown |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | React error boundary |
| `CreateProjectDialog` | `src/components/CreateProjectDialog.tsx` | New project creation |
| `LogoUpload` | `src/components/LogoUpload.tsx` | Company logo upload |
| `ComponentGenerator` | `src/components/ComponentGenerator.tsx` | Dynamic component generator |
| `StoicQuote` | `src/components/StoicQuote.tsx` | Motivational quote display |

### Complete Domain Directory Map
| Directory | Components Count | Purpose |
|-----------|-----------------|---------|
| `ui/` | 50+ | shadcn/ui primitives |
| `layout/` | 3 | PageLayout, PageContent, PageHeader |
| `common/` | 5+ | ProjectContextHeader, PageLoadingSpinner, shared utilities |
| `sidebar/` | 4+ | Sidebar config, components, workspace grouping |
| `auth/` | 1 | FirstLoginModal |
| `landing/` | 4 | Landing page sections |
| `dashboard/` | 6 + `roadmap/` | Dashboard widgets |
| `tenant/` | 48 + subdirs | Tenant management |
| `cable-schedules/` | 30 + `verification/` | Cable engineering |
| `bulk-services/` | 19 + `phases/` + `workflow/` | Bulk services workflow |
| `cost-reports/` | 23 + `pdf-export/` | Cost reporting |
| `final-accounts/` | 33 | Final account reconciliation |
| `boq/` | 12 + `wizard/` | Bill of quantities |
| `budgets/` | 16 | Electrical budgets |
| `drawings/` | 11 + `admin/` + `review/` | Drawing register |
| `site-diary/` | 10 + 6 subdirs | Site diary tasks |
| `floor-plan/` | 3 subdirs + config | Floor plan markup |
| `messaging/` | 37 | Internal messaging |
| `handover/` | 17 + `folders/` | Handover documents |
| `lighting/` | 5 + 14 subdirs | Lighting report |
| `specifications/` | 5 | Technical specifications |
| `procurement/` | 1 + `inspections/` | Procurement tracking |
| `db-legend-cards/` | 3 | DB legend cards |
| `master-library/` | 14 + `development-phases/` | Master materials & rates |
| `client-portal/` | 14 | Client portal |
| `contractor-portal/` | 13 + `procurement/` | Contractor portal |
| `cable-verification/` | 6 | Cable site verification |
| `generator/` | 2 | Generator report sharing |
| `portal/` | 3 | Portal shared components |
| `ai-tools/` | 7 | AI tools |
| `ai-skills/` | — | AI skill management |
| `finance/` | 19 | Financial management |
| `invoicing/` | 6 | Invoice management |
| `admin/` | 12 + 3 subdirs | Admin panel |
| `settings/` | 15 | Settings components |
| `project-settings/` | 6 + `report-automation/` | Project settings |
| `project-outline/` | 9 | Project outline |
| `projects/` | — | Project list components |
| `users/` | — | User management |
| `hr/` | — | HR management |
| `feedback/` | 2+ | Feedback system |
| `pwa/` | 7 | PWA components |
| `native/` | — | Capacitor native bridge |
| `walkthrough/` | 18 + 3 subdirs | Onboarding system |
| `shared/` | — | Cross-domain shared components |
| `pdf/` | — | PDF rendering components |
| `pdf-editor/` | — | PDF editor components |
| `templates/` | — | Document template components |
| `document-templates/` | — | Document template management |
| `documentation/` | — | App documentation |
| `prd/` | — | PRD management |
| `circuit-schedule/` | — | Circuit schedule |
| `cable-route/` | — | Cable route planning |
| `import-wizard/` | — | Generic import wizard |
| `storage/` | — | Storage management |
| `backup/` | — | Backup management |

---

## 7. Custom Hooks — Full Inventory

### Every Hook File in `src/hooks/`
| Hook | File | Purpose |
|------|------|---------|
| `use-mobile` | `use-mobile.tsx` | Detect mobile viewport (breakpoint-based) |
| `use-toast` | `use-toast.ts` | Toast notification hook (shadcn) |
| `useAISkills` | `useAISkills.ts` | CRUD for AI skill definitions |
| `useActivityLogger` | `useActivityLogger.tsx` | Log user actions to `user_activity_logs` |
| `useAsyncAction` | `useAsyncAction.ts` | Async action wrapper with loading/error state |
| `useBackgroundSync` | `useBackgroundSync.ts` | Background sync manager for offline queues |
| `useBudgetOfflineSync` | `useBudgetOfflineSync.ts` | IndexedDB offline queue for budget line items |
| `useCableOfflineSync` | `useCableOfflineSync.ts` | IndexedDB offline queue for cable entries |
| `useCalculationSettings` | `useCalculationSettings.tsx` | Cable calculation settings (voltage drop, derating) |
| `useChartPreCapture` | `useChartPreCapture.ts` | Capture chart as image for PDF export |
| `useClientAccess` | `useClientAccess.tsx` | Validate client portal access tokens |
| `useCompletionStreak` | `useCompletionStreak.ts` | Gamification completion streak tracking |
| `useConflictDetection` | `useConflictDetection.ts` | Detect and resolve optimistic update conflicts |
| `useConversations` | `useConversations.tsx` | Conversation CRUD with participant management |
| `useDebounce` | `useDebounce.ts` | Debounce value changes |
| `useDocumentation` | `useDocumentation.ts` | Application documentation CRUD |
| `useDraftMessage` | `useDraftMessage.tsx` | Auto-save message drafts (24h expiry) |
| `useDrawingChecklists` | `useDrawingChecklists.ts` | Drawing review checklists |
| `useDrawingFileUpload` | `useDrawingFileUpload.ts` | Upload drawing files to Dropbox/storage |
| `useDrawingOfflineSync` | `useDrawingOfflineSync.ts` | Drawing offline queue |
| `useDropbox` | `useDropbox.ts` | Dropbox OAuth connection management |
| `useDropboxActivityLogs` | `useDropboxActivityLogs.ts` | Dropbox sync activity history |
| `useDropboxTempLink` | `useDropboxTempLink.ts` | Generate temporary Dropbox file links |
| `useEmailTemplates` | `useEmailTemplates.ts` | Email template CRUD |
| `useExtractBOQTemplate` | `useExtractBOQTemplate.ts` | Extract BOQ template structure from upload |
| `useFeedbackNotifications` | `useFeedbackNotifications.tsx` | Feedback notification handling |
| `useGeolocation` | `useGeolocation.ts` | GPS coordinates capture (lat, lng, accuracy) |
| `useHandoverLinkStatus` | `useHandoverLinkStatus.tsx` | Check handover document link status |
| `useIdleTracker` | `useIdleTracker.ts` | Detect idle user (for session timeout) |
| `useImageCompression` | `useImageCompression.ts` | Client-side image compression before upload |
| `useImageLoader` | `useImageLoader.ts` | Lazy image loading with WebP/AVIF format detection |
| `useKnowledgeBase` | `useKnowledgeBase.ts` | Knowledge document management for RAG |
| `useLocalStorage` | `useLocalStorage.ts` | Persistent state in localStorage |
| `useMemoizedCallback` | `useMemoizedCallback.ts` | Stable callback references to prevent re-renders |
| `useMessages` | `useMessages.tsx` | Message CRUD with realtime subscription |
| `useMilestoneNotifications` | `useMilestoneNotifications.ts` | Milestone completion notifications |
| `useMunicipalityQuery` | `useMunicipalityQuery.ts` | Query municipality database for utility contacts |
| `useNativeApp` | `useNativeApp.tsx` | Capacitor native features detection |
| `useNativeKeyboard` | `useNativeKeyboard.tsx` | Mobile keyboard open/close handling |
| `useNativePushNotifications` | `useNativePushNotifications.tsx` | Native push notification registration |
| `useNativeUI` | `useNativeUI.tsx` | Native UI elements (status bar, splash screen) |
| `useNetworkStatus` | `useNetworkStatus.tsx` | Online/offline detection |
| `useNotifications` | `useNotifications.tsx` | In-app notification management |
| `useOfflineHandover` | `useOfflineHandover.ts` | Handover document offline queue |
| `useOfflineMessageQueue` | `useOfflineMessageQueue.tsx` | Message offline queue |
| `useOfflineQueue` | `useOfflineQueue.ts` | Generic offline queue |
| `useOfflineSiteDiary` | `useOfflineSiteDiary.ts` | Site diary offline queue |
| `useOfflineSync` | `useOfflineSync.ts` | Generic offline sync manager |
| `useOptimizedQuery` | `useOptimizedQuery.ts` | Query deduplication & optimization |
| `usePDFEditorHistory` | `usePDFEditorHistory.tsx` | PDF editor undo/redo history |
| `usePRDs` | `usePRDs.ts` | PRD document CRUD |
| `usePWAInstall` | `usePWAInstall.tsx` | PWA install prompt management |
| `usePaginatedQuery` | `usePaginatedQuery.ts` | Paginated data fetching |
| `useProject` | `useProject.ts` | Single project query |
| `useProjectClientCheck` | `useProjectClientCheck.ts` | Check if project has client contact assigned |
| `useProjectCompletion` | `useProjectCompletion.tsx` | Calculate project completion percentage |
| `useProjectDrawings` | `useProjectDrawings.ts` | Drawing register data |
| `useProjectDropboxFolder` | `useProjectDropboxFolder.ts` | Project Dropbox folder mapping |
| `useProjectIssues` | `useProjectIssues.tsx` | Project issues/blockers |
| `usePushNotifications` | `usePushNotifications.tsx` | Browser push notification subscription |
| `useRoadmapComments` | `useRoadmapComments.tsx` | Roadmap item comments CRUD |
| `useRoadmapCompletionCheck` | `useRoadmapCompletionCheck.ts` | Check roadmap item dependencies |
| `useRoleAccess` | `useRoleAccess.tsx` | Role-based access: `hasAccess('admin')` |
| `useSessionMonitor` | `useSessionMonitor.ts` | Auto-logout on session expiry |
| `useStorageQuota` | `useStorageQuota.ts` | Monitor browser storage quota |
| `useSvgPdfReport` | `useSvgPdfReport.ts` | SVG-PDF report generation hook |
| `useTenantHandoverProgress` | `useTenantHandoverProgress.ts` | Per-tenant handover completion status |
| `useTenantPresence` | `useTenantPresence.tsx` | Multi-user tenant editing presence |
| `useTypingIndicator` | `useTypingIndicator.tsx` | Messaging typing indicator |
| `useUnreadMessages` | `useUnreadMessages.tsx` | Unread message counts per conversation |
| `useUserRole` | `useUserRole.tsx` | Fetch current user's role |
| `useWalkthroughTrigger` | `useWalkthroughTrigger.tsx` | Trigger walkthrough tours |

---

## 8. Edge Functions (Backend) — Full Inventory

### Complete List (78 functions in `supabase/functions/`)

#### Shared Utilities
| Directory | Purpose |
|-----------|---------|
| `_shared/` | Shared modules: `email.ts` (Resend email sending), `email-templates.ts` (HTML templates) |

#### AI Functions (9)
| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `ai-chat` | User message, context, skill | AI response | Engineering Q&A chatbot |
| `ai-analyze-data` | Project data, analysis type | Analysis results | Data pattern analysis |
| `ai-predict-costs` | Historical data, parameters | Cost predictions | Cost forecasting |
| `ai-generate-document` | Template, data | Document content | Document auto-generation |
| `ai-review-application` | Application data | Review scores, findings | Automated code review |
| `lighting-recommendations` | Room data, requirements | Fitting recommendations | AI lighting design |
| `lighting-insights` | Lighting schedule data | Analysis insights | Lighting load analysis |
| `search-knowledge` | Query, embedding | Matched chunks | Semantic search via pgvector |
| `embed-document` | Document content | Vector embeddings | RAG embedding generation |

#### Notification Functions (28)
| Function | Trigger | Email Content |
|----------|---------|--------------|
| `send-message-notification` | @mention in message | "X mentioned you in a message" |
| `send-push-notification` | Message/action | Browser push notification payload |
| `send-client-portal-notification` | Client portal activity | Portal activity summary |
| `send-legend-card-notification` | Legend card submit/status | DB legend card status update |
| `send-cable-verification-email` | Verification completion | Verification certificate summary |
| `send-cable-verification-notification` | Verification activity | Activity alert |
| `send-drawing-review-notification` | Drawing submitted/reviewed | Drawing review status |
| `send-roadmap-assignment-notification` | Task assigned | "You've been assigned to..." |
| `send-roadmap-comment-notification` | Comment added | "X commented on..." |
| `send-roadmap-completion-notification` | Milestone completed | Milestone completion summary |
| `send-roadmap-due-date-notification` | Due date approaching | Due date reminder |
| `send-roadmap-review-update` | External reviewer feedback | Review update |
| `send-roadmap-share-invitation` | Share link created | "You've been invited to review..." |
| `send-status-update-notification` | Status change | General status update |
| `send-approval-notification` | Approval workflow action | Approval/rejection notification |
| `send-deadline-notification` | Deadline approaching | Deadline reminder |
| `send-feedback-response` | Feedback response | Feedback response notification |
| `send-invoice-reminder` | Invoice due | Payment reminder |
| `send-item-shared-notification` | Item shared | "X shared a document with you" |
| `send-rfi-notification` | RFI created/responded | RFI notification |
| `send-section-review-email` | Section sent for review | Section review request |
| `send-review-findings` | Review completed | Review findings summary |
| `send-review-status-notification` | Review status change | Status change |
| `send-scheduled-report` | Scheduled delivery | Scheduled report delivery |
| `send-weekly-streak-summary` | Weekly cron | Weekly gamification summary |
| `send-generator-report-share` | Report shared | Generator report share link |
| `generate-portal-summary-email` | Portal summary | Portal summary compilation |
| `notify-admin-feedback` | Feedback submitted | Admin feedback alert |

#### Scheduled/Batch Functions (4)
| Function | Purpose |
|----------|---------|
| `notify-expiring-portal-tokens` | Warn about expiring portal tokens |
| `check-tenant-notifications` | Check tenant deadlines and send reminders |
| `process-roadmap-notifications` | Batch process roadmap notifications |
| `populate-tenant-deadlines` | Auto-set tenant deadlines from project config |

#### Extraction & Processing Functions (12)
| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `extract-boq-rates` | Excel/PDF upload | Extracted items | AI-powered BOQ parsing |
| `extract-boq-template-structure` | Template file | Section/item structure | Parse BOQ template |
| `extract-budget` | Budget document | Budget data | Parse budget documents |
| `extract-invoice-pdf` | Invoice PDF | Invoice data | Extract invoice details |
| `extract-lighting-specs` | Spec sheet | Lighting specs | Parse lighting specifications |
| `extract-payment-schedule` | Payment doc | Schedule data | Extract payment schedule |
| `match-boq-rates` | Extracted items | Matched materials | Match to master library |
| `scan-circuit-layout` | Circuit image | Circuit data | Circuit layout scanning |
| `scan-invoice` | Invoice image | Invoice fields | Invoice OCR |
| `analyze-pdf-issue` | PDF file | Quality report | PDF quality analysis |
| `analyze-pdfmake` | PdfMake definition | Compatibility check | PdfMake compatibility |
| `convert-word-to-pdf` | Word document | PDF | Word → PDF conversion |

#### User Management Functions (4)
| Function | Auth | Purpose |
|----------|------|---------|
| `invite-user` | Admin JWT | Create user + send invitation email with temp password |
| `set-user-password` | Admin JWT | Set user password (validates 12+ chars, upper/lower/number/special) + set `must_change_password = true` |
| `reset-user-password` | Admin JWT | Trigger password reset email |
| `admin-reset-password` | Admin JWT | Admin-initiated password reset |

#### Integration Functions (12)
| Function | External Service | Purpose |
|----------|-----------------|---------|
| `dropbox-auth` | Dropbox | Initiate OAuth flow |
| `dropbox-exchange-code` | Dropbox | Exchange OAuth code for tokens |
| `dropbox-oauth-callback` | Dropbox | Handle OAuth callback |
| `dropbox-api` | Dropbox | Proxy API calls with user's token |
| `get-mapbox-token` | Mapbox | Securely retrieve Mapbox token |
| `google-sheets-sync` | Google Sheets | Sync data to/from Sheets |
| `fetch-external-meters` | External meters API | Fetch meter data |
| `fetch-greencalc-tariffs` | GreenCalc | Fetch tariff data |
| `fetch-tenant-schedule` | Internal | Fetch tenant schedule for portals |
| `sync-load-profiles` | Internal | Sync load profiles between modules |
| `sync-drawings` | Dropbox | Scan Dropbox → download PDFs → insert into project_drawings |
| `query-municipality` | Internal | Query municipality database |

#### System Functions (9)
| Function | Purpose |
|----------|---------|
| `backup-database` | Create database backup |
| `restore-backup` | Restore from backup |
| `generate-boq` | Generate BOQ document |
| `generate-component` | Dynamic React component generation |
| `generate-infographic` | Generate infographic images |
| `run-scheduled-review` | Scheduled application review |
| `analyze-repository` | Repository code analysis |
| `agent-gateway` | AI agent API gateway |
| `replicate-schema` | Replicate schema to target DB |
| `run-target-sql` | Execute SQL on target database |
| `discover-external-schema` | Discover external DB schema |

---

## 9. Database Schema & Functions

(Same as v1 — complete table listing)

### Key Tables (300+ total — categorized)

**Project Core:**
- `projects` — id, name, project_number, description, type, status, created_by, created_at
- `project_members` — id, user_id, project_id, position (owner/admin/primary/secondary/member), created_at
- `project_roadmap_items` — id, project_id, title, description, status, priority, phase, assigned_to, due_date, completed_at, external_link, roadmap_item_id, created_at
- `project_roadmap_comments` — id, item_id, user_id, content, created_at
- `completion_streaks` — id, user_id, project_id, current_streak, longest_streak, last_completed_at

**Tenants:**
- `tenants` — id, project_id, shop_number, tenant_name, area, tenant_type, kw_allocated, kw_override, status, various deadline fields, various boolean flags (has_electrical_layout, etc.), created_at, updated_at
- `tenant_documents` — id, tenant_id, project_id, document_type (13 types), file_name, file_path, file_size, uploaded_by, created_at
- `tenant_schedule_versions` — id, project_id, version_number, description, created_by, created_at
- `tenant_change_audit_log` — id, project_id, tenant_id, field_name, old_value, new_value, changed_by, changed_at, version
- `tenant_kw_override_audit` — id, tenant_id, old_value, new_value, reason, changed_by, created_at

**Cable Schedules:**
- `cable_schedules` — id, project_id, name, description, created_by
- `cable_entries` — id, schedule_id, cable_tag, from_location, to_location, cable_type, cable_size, length, load_kw, load_amps, voltage_drop_percent, status, derating_factor, installation_method, grouping_factor, etc.
- `cable_sizing_references` — reference tables for SANS 10142-1

**Electrical Budget:**
- `electrical_budgets` → `budget_sections` → `budget_line_items`
- `budget_reference_drawings`

**BOQ:**
- `project_boqs` → `boq_bills` → `boq_project_sections` → `boq_items`
- `boq_uploads` → `boq_extracted_items`
- `boq_section_templates`, `boq_item_templates`
- `boq_sections` (standard sections)

**Cost Reports:**
- `cost_reports` → `cost_categories` → `cost_line_items`
- `cost_variations` → `cost_variation_history`

**Final Accounts:**
- `final_accounts` → `final_account_bills` → `final_account_sections` → `final_account_items`
- `final_account_item_history`

**Bulk Services:**
- `bulk_services_documents` — all calculation data (loads, demand, diversity, climatic zone, SANS entries, etc.)
- `bulk_services_workflow_phases` → `bulk_services_workflow_tasks`
- `bulk_services_sections`, `bulk_services_reports`
- `bulk_services_tutorial_progress`, `bulk_services_workflow_snapshots`

**Messaging:**
- `conversations` → `messages`
- `message_reactions`, `message_read_receipts`, `message_notifications`
- `archived_conversations`
- `push_subscriptions` — VAPID push subscription data

**Portals:**
- `client_portal_tokens` — token, project_id, email, expires_at, access_count
- `client_portal_access_log` — token_id, ip_address, user_agent, accessed_at
- `contractor_portal_tokens` — token, short_code, project_id, contractor_type, expires_at
- `contractor_portal_access_log` — token_id, ip_address, user_agent, accessed_at
- `cable_verification_tokens` — token, schedule_id, expires_at
- `cable_verifications` — entry_id, status, photo_url, gps_lat, gps_lng, gps_accuracy, electrician_name, ecsa_number, signature_data
- `client_project_access` — user_id, project_id

**Materials:**
- `master_materials` → `material_categories`
- `material_rate_sources` — source, confidence, supply_rate, install_rate
- `material_price_audit` — material_id, old_price, new_price, change_percent, changed_by
- `master_rate_library` — id, description, unit, rate, category
- `rate_change_audit`

**HR & Staff:**
- `employees` — personal details, position, department, employment type
- `attendance_records` — clock_in, clock_out, break times, total_hours
- `benefits` — category, name, provider, cost

**Finance:**
- `finance_projects`, `finance_invoices`, `finance_expenses`
- `invoice_schedules`, `payment_schedules`

**System:**
- `profiles` — id, email, full_name, avatar_url, must_change_password, status, last_sign_in, login_count
- `user_roles` — user_id, role
- `user_activity_logs` — user_id, action, details, created_at
- `user_storage_connections` — user_id, provider (dropbox), access_token, refresh_token, expires_at
- `status_notifications` — user_id, type, title, message, is_read
- `notification_queue` — scheduled notifications
- `notification_preferences` — user_id, channel, enabled
- `application_documentation` — section_key, section_name, content
- `application_reviews` — focus_areas, overall_score, review_data
- `ai_skills` — name, instructions, category, is_active
- `ai_prediction_reports` — project_id, report_name, file_path, engine_version
- `knowledge_documents` — title, content, file_path
- `knowledge_chunks` — document_id, chunk_text, embedding (vector)
- `backup_jobs`, `backup_history`, `backup_files`, `backup_health_checks`
- `document_templates` — template_type, name, content
- `pdf_template_configs` — template settings
- `approval_workflows` — document_id, document_type, approver_id, status, comments
- `project_drawings` — drawing_number, drawing_title, discipline, status, revision, category, file_url

### Database Views
- `material_rate_analytics` — Aggregated rate analytics per material
- `material_rate_by_contractor` — Rates broken down by contractor
- `material_rate_by_province` — Rates broken down by province

### Key Database Functions (complete list)
| Function | Type | Purpose |
|----------|------|---------|
| `is_admin(user_id)` | Query | Check if user has admin role |
| `has_project_access(user_id, project_id)` | Query | Check project membership |
| `user_has_project_access(_project_id)` | Query (RLS) | `is_admin(auth.uid()) OR has_project_access(auth.uid(), _project_id)` |
| `client_has_project_access(user_id, project_id)` | Query | Check client access |
| `has_valid_client_portal_token(project_id)` | Query (RLS) | Check for valid, non-expired client token |
| `has_valid_contractor_portal_token(project_id)` | Query (RLS) | Check for valid, non-expired contractor token |
| `validate_client_portal_token(token)` | Mutation | Validate token + log access + increment counter |
| `validate_contractor_portal_token(token)` | Mutation | Validate token + log access + increment counter |
| `generate_client_portal_token(project_id, email)` | Mutation | Generate hex token from `gen_random_bytes(32)` |
| `validate_portal_short_code(code)` | Query | Validate short code → return project_id |
| `log_tenant_change()` | Trigger | Audit tenant modifications with field diff |
| `log_kw_override_change()` | Trigger | Audit kW override changes |
| `sync_tenant_document_status()` | Trigger | Update tenant boolean flags on document changes |
| `increment_tenant_schedule_version()` | Trigger | Auto-increment version in `tenant_schedule_versions` |
| `log_final_account_item_change()` | Trigger | Audit final account item changes |
| `log_variation_change()` | Trigger | Audit cost variation changes |
| `log_material_price_change()` | Trigger | Audit material price changes with % change |
| `log_procurement_status_change()` | Trigger | Audit procurement status changes |
| `create_procurement_roadmap_item()` | Trigger | Auto-create roadmap item on procurement create |
| `sync_procurement_to_roadmap()` | Trigger | Sync procurement completion to roadmap |
| `calculate_boq_item_amount()` | Trigger | `total_amount = quantity × total_rate` |
| `calculate_boq_item_costs()` | Trigger | `supply_cost = quantity × supply_rate` |
| `update_boq_section_totals()` | Trigger | Sum item totals → section total |
| `update_boq_bill_totals()` | Trigger | Sum section totals → bill total |
| `update_bill_totals()` | Trigger | Final account cascading totals |
| `update_completion_streak()` | Trigger | Gamification streak on roadmap completion |
| `update_message_reply_count()` | Trigger | Thread reply counter |
| `update_folder_path()` | Trigger | Handover folder path maintenance |
| `validate_cable_entry()` | Trigger | Reject invalid cable tags/locations |
| `detect_drawing_category()` | Trigger | Auto-detect drawing category from number |
| `notify_task_assignment()` | Trigger | Notify on site diary task assignment |
| `check_unique_engineer_position()` | Trigger | Enforce unique primary/secondary engineer |
| `ensure_single_default_cover()` | Trigger | Only one default cover template |
| `increment_material_usage()` | Trigger | Count material usage across projects |
| `match_knowledge_chunks(embedding, match_threshold, match_count)` | Query | pgvector similarity search |
| `queue_roadmap_due_notifications(days_ahead)` | Mutation | Batch queue due date notifications |

---

## 10. Utility & Library Modules — Full Inventory

### `src/utils/` — Every File
| File | Purpose | Key Functions |
|------|---------|---------------|
| `cableSizing.ts` | SANS 10142-1 cable sizing | `calculateCableSize()`, `calculateVoltageDrop()`, `getDeRatingFactor()` |
| `cableOptimization.ts` | Cable route optimization | `optimizeCableSelection()`, `suggestAlternatives()` |
| `cableValidation.ts` | Cable entry validation | `validateCableTag()`, `validateLocation()` |
| `generatorSizing.ts` | Generator sizing from loads | `calculateGeneratorSize()`, `calculateFuelConsumption()`, `calculateRecovery()` |
| `costReportCalculations.ts` | Cost report math | `calculateAnticipatedFinal()`, `calculateVariance()` |
| `dateCalculations.ts` | Date utilities | `calculateDeadline()`, `businessDaysBetween()` |
| `decimalPrecision.ts` | Decimal.js wrappers | `safeMultiply()`, `safeAdd()`, `roundCurrency()` |
| `formatters.ts` | Formatting | `formatCurrency()`, `formatNumber()`, `formatDate()`, `formatPercentage()` |
| `tenantSorting.ts` | Tenant list sorting | `sortTenants()` (by shop number, name, area, status) |
| `excelParser.ts` | Excel parsing | `parseExcelFile()`, `extractSheetData()` |
| `pdfConstants.ts` | PDF styling constants | Colors, fonts, margins, page sizes |
| `pdfStyleManager.ts` | PDF style management | Style registration, consistency enforcement |
| `pdfQualitySettings.ts` | PDF quality config | DPI, compression, font embedding settings |
| `pdfFilenameGenerator.ts` | Smart filenames | `generatePdfFilename()` (project + report + date) |
| `pdfComplianceChecker.ts` | PDF compliance | Check generated PDFs against design standards |
| `pdfUserPreferences.ts` | PDF user prefs | Load/save PDF export preferences |
| `placeholderDetection.ts` | Template placeholders | `detectPlaceholders()`, `listMissingValues()` |
| `templatePlaceholderInsertion.ts` | Insert values | `insertPlaceholderValues()` |
| `reportTemplateSchemas.ts` | Template schemas | Zod schemas for report templates |
| `validateCostReportTemplate.ts` | Template validation | Validate cost report template structure |
| `generateCostReportTemplate.ts` | Template generation | Generate cost report template |
| `prepareCostReportTemplateData.ts` | Template data prep | Prepare data for template insertion |
| `captureUIForPDF.ts` | UI capture | Capture UI components as images for PDF |
| `componentToImage.ts` | Component → image | Render React component to image |
| `executiveSummaryTable.ts` | Executive summary | Generate executive summary table data |
| `analyzeWordTemplate.ts` | Word analysis | Analyze Word document template structure |
| `sectionPdfExport.ts` | Section export | Export individual sections as PDF |
| `roadmapReviewCalculations.ts` | Review calcs | Calculate review scores and metrics |
| `filesystem.ts` | File system | File read/write utilities (Capacitor) |
| `haptics.ts` | Haptics | Haptic feedback wrappers |
| `native.ts` | Native utils | Native platform utilities |
| `platform.ts` | Platform detection | Detect web/iOS/Android |
| `share.ts` | Share utils | Native share sheet |
| `offlineMessageQueue.ts` | Message queue | Offline message queue management |

### `src/utils/svg-pdf/` — Every Builder (34 files)
| File | Purpose |
|------|---------|
| `sharedSvgHelpers.ts` | Shared SVG element creation, text, tables, cover pages, headers, footers |
| `svgToPdfEngine.ts` | SVG-to-PDF conversion engine (svg2pdf.js) |
| `svgChartHelpers.ts` | SVG chart rendering helpers |
| `imageUtils.ts` | Image handling for SVG PDFs |
| `costReportPdfBuilder.ts` | Cost report PDF (Navy/Blue palette) |
| `costReportServerPdfBuilder.ts` | Server-side cost report PDF |
| `generatorReportPdfBuilder.ts` | Generator report PDF (Cover → Terms → TOC → Sections → Appendices) |
| `cableSchedulePdfBuilder.ts` | Cable schedule PDF |
| `electricalBudgetPdfBuilder.ts` | Electrical budget PDF |
| `bulkServicesPdfBuilder.ts` | Bulk services PDF |
| `specificationPdfBuilder.ts` | Specification PDF |
| `tenantReportPdfBuilder.ts` | Tenant report PDF |
| `tenantTrackerPdfBuilder.ts` | Tenant tracker PDF |
| `tenantEvaluationPdfBuilder.ts` | Tenant evaluation PDF |
| `finalAccountPdfBuilder.ts` | Final account PDF |
| `roadmapExportPdfBuilder.ts` | Roadmap export PDF |
| `roadmapReviewPdfBuilder.ts` | Roadmap review PDF |
| `siteDiaryPdfBuilder.ts` | Site diary PDF |
| `projectOutlinePdfBuilder.ts` | Project outline PDF |
| `lightingReportPdfBuilder.ts` | Lighting report PDF |
| `verificationCertPdfBuilder.ts` | Cable verification certificate PDF |
| `legendCardPdfBuilder.ts` | DB legend card PDF |
| `handoverCompletionPdfBuilder.ts` | Handover completion PDF |
| `warrantySchedulePdfBuilder.ts` | Warranty schedule PDF |
| `payslipPdfBuilder.ts` | Payslip PDF |
| `contractorPortalPdfBuilder.ts` | Contractor portal export PDF |
| `conversationPdfBuilder.ts` | Conversation export PDF |
| `deadlineReportPdfBuilder.ts` | Deadline report PDF |
| `floorPlanPdfBuilder.ts` | Floor plan PDF |
| `aiPredictionPdfBuilder.ts` | AI prediction report PDF |
| `comparisonPdfBuilder.ts` | Report comparison PDF |
| `reportBuilderPdfBuilder.ts` | Generic report builder PDF |
| `templatePdfBuilder.ts` | Template-based PDF |
| `complianceChecker.ts` | PDF compliance checking |

### `src/utils/pdf/` — Legacy PDF
| File | Purpose |
|------|---------|
| `jspdfStandards.ts` | jsPDF styling standards (being phased out) |
| `electricalBudgetHtmlTemplate.ts` | HTML template for budget PDF |

### `src/lib/` — Every File
| File | Purpose | Key Functions |
|------|---------|---------------|
| `utils.ts` | `cn()` class merger | `cn()` = `clsx()` + `twMerge()` |
| `validation.ts` | Input validation | `validateEmail()`, `validatePhoneNumber()`, `validateRequired()` |
| `passwordValidation.ts` | Password strength | `validatePassword()` (12+ chars, upper, lower, number, special) |
| `csvExport.ts` | CSV export | `exportToCSV()`, `generateCSVContent()` |
| `conflictResolution.ts` | Conflict handling | `resolveConflict()`, `mergeChanges()` |
| `errorHandling.ts` | Error handling | `handleSupabaseError()`, `formatErrorMessage()` |
| `fileViewer.ts` | File preview | `getFileViewerUrl()`, `isPreviewable()` |
| `offlineStorage.ts` | IndexedDB | `openDB()`, `getStore()`, `putItem()`, `getAllItems()`, `deleteItem()` |
| `storageQuota.ts` | Storage quota | `getStorageQuota()`, `getUsagePercent()` |
| `queryOptimization.ts` | Query dedup | `deduplicateQuery()`, `batchQueries()` |
| `assetOptimization.ts` | Asset loading | `lazyLoadImage()`, `preloadAsset()` |

---

## 11. Type Definitions

### `src/types/`
| File | Purpose |
|------|---------|
| `index.ts` | Re-exports all types |
| `common.ts` | Shared interfaces (BaseEntity, PaginatedResponse, SortConfig, FilterConfig) |
| `documents.ts` | Document types (DocumentType enum, DocumentMetadata, UploadConfig) |
| `drawings.ts` | Drawing types (DrawingStatus, DrawingDiscipline, DrawingCategory) |
| `drawingChecklists.ts` | Checklist types (ChecklistItem, ChecklistCategory, ReviewStatus) |
| `cableVerification.ts` | Verification types (VerificationStatus, VerificationEntry, ElectricianCredentials, GPSData) |

---

## 12. Contexts & Providers

| Context | File | Purpose |
|---------|------|---------|
| `ConflictContext` | `src/contexts/ConflictContext.tsx` | Optimistic update conflict resolution — provides `showConflict()`, `resolveConflict()` → renders `ConflictResolutionDialog` |
| `WalkthroughContext` | `src/components/walkthrough/WalkthroughContext.tsx` | Tour state management — active tour, current step, `startTour()`, `nextStep()`, `endTour()` |

---

## 13. External Portals & Token-Based Access

### Client Portal (`/client-portal`)
**Auth Flow:**
1. Client receives email with portal token link
2. Navigates to `/client-portal` → enters token
3. `validate_client_portal_token(token)` DB function called → validates expiry, logs access, increments counter
4. On success → stores token in session → shows project data
**Components (14):**
| Component | Purpose |
|-----------|---------|
| `ClientPortalManagement` | Admin management of client portal tokens |
| `ClientApproval` | Approve/reject workflow |
| `ClientComments` | Add comments/feedback |
| `ClientFeedbackForm` | Structured feedback form |
| `ClientDocumentsList` | Download project documents |
| `ClientHandoverDocuments` | Handover document access |
| `ClientGeneratorCostingSection` | Generator costing read-only view |
| `ClientCapitalRecoverySection` | Capital recovery read-only view |
| `ClientRunningRecoverySection` | Running recovery read-only view |
| `ClientRequestForm` | Submit client requests |
| `FAQSection` | Frequently asked questions |
| `QuickActions` | Quick action buttons |
| `ReviewChecklist` | Review checklist |
| `SectionReviewStatus` | Section-by-section review status |

### Contractor Portal (`/contractor-portal`)
**Auth Flow:**
1. Contractor receives token or short code
2. Short code access: `/p/:code` → `validate_portal_short_code(code)` → redirect with token
3. Full token: enter at `/contractor-portal` → `validate_contractor_portal_token(token)`
4. On success → shows tabbed interface
**Components (13):**
| Component | Purpose |
|-----------|---------|
| `ContractorCableStatus` | Cable schedule read-only status |
| `ContractorDBLegendCards` | Submit/view legend cards |
| `ContractorDrawingRegister` | Drawing register with revisions |
| `ContractorFloorPlanView` | Floor plan read-only view |
| `ContractorInspectionRequests` | Submit inspection requests |
| `ContractorPortalExportButton` | Export portal data as PDF |
| `ContractorProcurementStatus` | Procurement status view |
| `ContractorRFISection` | RFI create/view |
| `ContractorTenantTracker` | Tenant schedule view |
| `DBLegendCardForm` | Legend card data entry form |
| `DBLegendCardSubmitDialog` | Submit confirmation dialog |
| `DeadlineExportButton` | Export deadlines |
| `PortalUserIdentityDialog` | Capture contractor identity |
**Tabs:** Dashboard, Tenants, Drawing Register, Procurement, Cable Status, Inspections, DB Legend Cards, RFIs

### Cable Verification Portal (`/cable-verification`)
**Auth:** Token-based (UUID tokens linked to specific cable schedule)
**Mobile-Optimized Flow:**
1. Electrician receives verification link with token
2. Opens on mobile device → token validated
3. Sees list of cables to verify
4. Per cable: selects status (Verified / Issue / Not Installed)
5. Captures photo evidence → compressed client-side → uploaded to storage
6. GPS auto-captured (lat, lng, accuracy)
7. Enters credentials (name, ECSA number, SAIEE membership)
8. Signs digital signature (HTML5 canvas)
9. Submits → triggers `send-cable-verification-email` + `send-cable-verification-notification`
10. Verification Certificate PDF generated
**Components (6):**
| Component | Purpose |
|-----------|---------|
| `CableVerificationList` | List of cables to verify |
| `CableVerificationItem` | Individual cable verification form |
| `LocationCaptureButton` | GPS coordinate capture |
| `ElectricianCredentialsForm` | ECSA/SAIEE credentials |
| `SignatureCanvas` | Digital signature pad |
| `VerificationProgressBar` | Completion progress |

### Portal Shared Components
| Component | File | Purpose |
|-----------|------|---------|
| `PortalHeader` | `src/components/portal/PortalHeader.tsx` | Shared portal header |
| `PortalBulkServices` | `src/components/portal/PortalBulkServices.tsx` | Bulk services portal view |
| `PortalCableSchedule` | `src/components/portal/PortalCableSchedule.tsx` | Cable schedule portal view |

---

## 14. PWA & Offline Capabilities

### PWA Components (7)
| Component | File | Purpose |
|-----------|------|---------|
| `OfflineIndicator` | `OfflineIndicator.tsx` | Global banner "You are offline" |
| `OfflineSyncStatusBar` | `OfflineSyncStatusBar.tsx` | Sync queue status bar |
| `PWAInstallPrompt` | `PWAInstallPrompt.tsx` | "Install as app" prompt |
| `PWAUpdatePrompt` | `PWAUpdatePrompt.tsx` | "New version available" prompt |
| `ConflictResolutionDialog` | `ConflictResolutionDialog.tsx` | Resolve sync conflicts |
| `StorageWarningBanner` | `StorageWarningBanner.tsx` | Storage quota warning |
| `StorageStatusCard` | `StorageStatusCard.tsx` | Storage usage card |

### Offline Storage Architecture
```
IndexedDB (src/lib/offlineStorage.ts)
├── cable-entries-queue     → useCableOfflineSync
├── budget-items-queue      → useBudgetOfflineSync
├── drawings-queue          → useDrawingOfflineSync
├── site-diary-queue        → useOfflineSiteDiary
├── messages-queue          → useOfflineMessageQueue
├── handover-queue          → useOfflineHandover
└── generic-sync-queue      → useOfflineSync
```
**Sync Flow:**
1. User makes change while offline → stored in IndexedDB queue
2. `useNetworkStatus` detects reconnection
3. `useBackgroundSync` processes queues
4. `useConflictDetection` checks for server-side changes
5. If conflict → `ConflictResolutionDialog` shows options (keep local / keep server / merge)

---

## 15. PDF Generation & Reporting Engine — Full Inventory

### 34 PDF Builders (all in `src/utils/svg-pdf/`)
Every report type with its builder file — see Section 10 above.

### Engine Architecture
```
1. Data Collection (React component collects data from queries)
2. Builder Function (e.g., buildCostReportPdf(data))
   → Creates SVGSVGElement[] array (one per page)
   → Uses sharedSvgHelpers: createSvgElement, el, textEl, buildStandardCoverPageSvg
   → Applies applyRunningHeaders, applyPageFooters
3. SVG-to-PDF Engine (svgToPdfEngine.ts)
   → Converts SVG elements to PDF pages using svg2pdf.js + jsPDF
   → Applies quality settings from pdfQualitySettings.ts
4. Download (Blob → URL → anchor click)
```

### Design Standards
- **Colors:** Navy (#1a1a2e), Blue (#0284c7), Light backgrounds
- **Layout:** Rounded background cards, consistent margins
- **Headers:** Running headers with report title + project name
- **Footers:** Page numbers, company info, generation date
- **Cover pages:** Standardized via `buildStandardCoverPageSvg()` with project details
- **Tables:** Built via `buildTablePages()` with alternating row colors

---

## 16–20: (Same as v1 with no changes needed)

Sections 16 (Messaging), 17 (AI Integration), 18 (Walkthrough), 19 (Inter-Page Communication), and 20 (Security) remain as documented in v1.

---

## 21. Admin Panel — Full Breakdown

### Admin Components (`src/components/admin/`)
| Component | File | Purpose |
|-----------|------|---------|
| `ApplicationReviewDialog` | `ApplicationReviewDialog.tsx` | AI application review dialog |
| `ReviewHistoryDashboard` | `ReviewHistoryDashboard.tsx` | Review history and trends |
| `ReviewComparisonView` | `ReviewComparisonView.tsx` | Compare reviews side-by-side |
| `ReviewStreamingProgress` | `ReviewStreamingProgress.tsx` | Live streaming review progress |
| `ReviewNotificationTrigger` | `ReviewNotificationTrigger.tsx` | Trigger review notifications |
| `ScheduledReviewSettings` | `ScheduledReviewSettings.tsx` | Configure scheduled reviews |
| `ProgressTrackingView` | `ProgressTrackingView.tsx` | Track improvement progress |
| `AIImplementationGuide` | `AIImplementationGuide.tsx` | AI implementation guidance |
| `DocumentTabSelector` | `DocumentTabSelector.tsx` | Select documentation tab |
| `ManageClientAccess` | `ManageClientAccess.tsx` | Manage client access tokens |
| `ContractorPortalWidget` | `ContractorPortalWidget.tsx` | Contractor portal overview widget |
| `TestPdfGeneratorPanel` | `TestPdfGeneratorPanel.tsx` | Test PDF generation |
| Email templates | `email-templates/` | Email template management (EmailTemplatesAdmin, EmailTemplateEditor) |
| Gamification | `gamification/` | Gamification admin components |
| Roadmap review | `roadmap-review/` | Admin roadmap review components |

### Admin Pages
| Page | Purpose |
|------|---------|
| **Finance** | Financial overview: project list, cash flow charts, expense tracking, aging reports, monthly KPI cards, heatmap calendar |
| **Invoicing** | Invoice management: schedule, bulk import, notifications, cash flow projection, monthly summary |
| **Staff Management** | Employee records, attendance tracking, benefits management |
| **User Management** | User accounts: invite, set password, reset password, role assignment, status management |
| **Backup Management** | Database backups: create, restore, schedule, health checks |
| **Gamification** | Streak settings, leaderboards, achievements |
| **AI Review** | Automated application review: trigger, history, comparison, scheduled reviews |
| **Feedback** | User feedback management: view, respond, analytics |
| **PRD Manager** | Product requirement documents: CRUD, versioning |
| **PDF Compliance** | Check PDF outputs against design standards |

---

## 22. Settings — Full Breakdown

### User Settings Components
| Component | Purpose |
|-----------|---------|
| `AvatarUpload` | Upload/change profile picture |
| `CompanySettings` | Company name, address, logo, registration details |
| `CloudStorageSettings` | Connect/disconnect Dropbox, manage folder mappings |
| `InvoiceSettings` | Invoice numbering, payment terms, bank details |
| `NotificationPreferencesSettings` | Enable/disable notification channels (email, push, in-app) per category |
| `PDFExportSettings` | Default PDF quality, include cover page, template selection |
| `PWASettings` | Install app, check for updates, clear cache |
| `SessionSecuritySettings` | Session timeout duration, auto-logout preferences |
| `ProjectContacts` | Project-specific contact management |
| `ProjectMembers` | Add/remove project members, change positions |
| `GlobalContactsManager` | Global contact directory |
| `TemplateManager` | Document template CRUD |
| `TemplatePlaceholderReference` | Reference guide for available placeholders |
| `CostReportTemplateGenerator` | Generate Word template for cost reports |
| `WordDocumentEditor` | Edit Word document templates |

---

*End of Master Document v2.0 — Every component, hook, function, trigger, and workflow explicitly documented.*
