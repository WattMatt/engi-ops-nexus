# WM Office (Engi-Ops Nexus) — Master Application Document
## Comprehensive Technical & Functional Reference
**Version:** 1.0 | **Generated:** 2026-02-21 | **Platform:** React 18 / Vite / TypeScript / Supabase

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Routing & Navigation Structure](#4-routing--navigation-structure)
5. [Page-by-Page Breakdown](#5-page-by-page-breakdown)
6. [Component Architecture](#6-component-architecture)
7. [Custom Hooks Library](#7-custom-hooks-library)
8. [Edge Functions (Backend)](#8-edge-functions-backend)
9. [Database Schema & Functions](#9-database-schema--functions)
10. [Utility Libraries](#10-utility-libraries)
11. [External Portals & Token-Based Access](#11-external-portals--token-based-access)
12. [PWA & Offline Capabilities](#12-pwa--offline-capabilities)
13. [PDF Generation & Reporting Engine](#13-pdf-generation--reporting-engine)
14. [Messaging & Notifications](#14-messaging--notifications)
15. [AI Integration](#15-ai-integration)
16. [Walkthrough & Onboarding System](#16-walkthrough--onboarding-system)
17. [Inter-Page Communication & Data Flow](#17-inter-page-communication--data-flow)
18. [Security Model](#18-security-model)

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
| **Admin** | Full system | Platform administration, user management, finance |
| **Moderator** | Elevated | Project oversight, report approvals |
| **User** | Standard | Project member, engineering tasks |
| **Client** | External portal | Token-based read access to project reports |
| **Contractor** | External portal | Token-based access to drawings, procurement, inspections |
| **Site Electrician** | External portal | Cable verification with GPS + photo evidence |

---

## 2. Tech Stack & Architecture

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Vite bundler) |
| Language | TypeScript 5.x (strict mode) |
| UI System | shadcn/ui (Radix Primitives) + Tailwind CSS 3.4 |
| Icons | Lucide React |
| Charts | Recharts 2.x |
| State/Data | TanStack Query v5 |
| Validation | Zod 3.x |
| Routing | React Router v6 |
| Theme | next-themes (light/dark/system) |
| Rich Text | TipTap |
| Canvas | Fabric.js (floor plan markup) |
| Maps | Mapbox GL |
| Drag & Drop | @dnd-kit |

### Backend (Supabase / Lovable Cloud)
| Service | Usage |
|---------|-------|
| **Auth** | Email/password, password reset, role-based access |
| **Postgres** | 300+ tables, RLS policies, triggers, functions |
| **Edge Functions** | 70+ Deno serverless functions |
| **Storage** | File uploads (drawings, photos, PDFs, documents) |
| **Realtime** | Live messaging, typing indicators, presence |

### Mobile
| Technology | Purpose |
|-----------|---------|
| Vite PWA Plugin | Service worker, offline caching |
| Capacitor 8 | Native iOS/Android wrapper |
| Native plugins | Camera, filesystem, haptics, push notifications, network status |

### Architecture Pattern
```
User → Browser/PWA/Capacitor
  → React SPA (lazy-loaded routes)
    → TanStack Query (cache layer)
      → Supabase Client SDK
        → Supabase Auth / Postgres / Storage / Edge Functions
          → External APIs (Resend, Mapbox, Dropbox, AI models)
```

---

## 3. Authentication & Authorization

### Auth Flow
```
Landing (/) → Auth (/auth) → [Email/Password Login]
  → First Login? → Password Change Modal (must_change_password flag)
  → Success → Project Select (/projects)
  → Select Project → Dashboard (/dashboard)
```

### Implementation Details
- **Auth page** (`src/pages/Auth.tsx`): Login & signup forms, forgot password
- **Set Password** (`src/pages/SetPassword.tsx`): Reset password callback from email link
- **First Login Modal** (`src/components/auth/FirstLoginModal.tsx`): Forced password change on first login
- **Session Monitor** (`src/hooks/useSessionMonitor.ts`): Auto-logout on session expiry
- **Role Access** (`src/hooks/useRoleAccess.tsx`): Role hierarchy (admin > moderator > user) with `hasAccess()` guard

### Role Enforcement
- `user_roles` table stores role per user
- `is_admin()` and `has_project_access()` DB functions used in RLS policies
- `project_members` table controls per-project access with positions (owner, admin, primary, secondary, member)
- Engineer positions (primary/secondary) enforced unique per project via `check_unique_engineer_position()` trigger

### Admin User Management
- Admins can invite users via `invite-user` edge function
- Set initial passwords via `set-user-password` edge function
- Reset passwords via `admin-reset-password` / `reset-user-password` edge functions
- Force `must_change_password` flag on profile

---

## 4. Routing & Navigation Structure

### Layout Hierarchy
```
App.tsx
├── Public Routes (no auth required)
│   ├── / (Landing)
│   ├── /auth (Login/Signup)
│   ├── /auth/set-password
│   ├── /client-portal, /contractor-portal, etc. (token-based)
│   └── /master-library, /contact-library (global)
│
├── /admin (AdminLayout - role: admin)
│   ├── /admin/projects
│   ├── /admin/finance
│   ├── /admin/invoicing
│   ├── /admin/staff
│   ├── /admin/users
│   ├── /admin/backup
│   ├── /admin/gamification
│   ├── /admin/ai-review
│   ├── /admin/feedback
│   ├── /admin/feedback-analytics
│   ├── /admin/settings
│   ├── /admin/prd-manager
│   ├── /admin/email-templates
│   ├── /admin/email-templates/:id
│   └── /admin/pdf-compliance
│
└── /dashboard (DashboardLayout - auth required + project selected)
    ├── /dashboard (Overview)
    ├── Core Project Workspace
    │   ├── /dashboard/roadmap
    │   ├── /dashboard/roadmap-review
    │   ├── /dashboard/project-outline
    │   └── /dashboard/tenant-tracker
    ├── Technical Design Workspace
    │   ├── /dashboard/drawings
    │   ├── /dashboard/cable-schedules
    │   ├── /dashboard/cable-schedules/:scheduleId
    │   ├── /dashboard/bulk-services
    │   ├── /dashboard/specifications
    │   ├── /dashboard/specifications/:specId
    │   ├── /dashboard/budgets/electrical
    │   └── /dashboard/budgets/electrical/:budgetId
    ├── Field Operations Workspace
    │   ├── /dashboard/site-diary
    │   ├── /dashboard/floor-plan
    │   ├── /dashboard/boqs
    │   ├── /dashboard/boqs/:boqId
    │   ├── /dashboard/boq/:uploadId
    │   ├── /dashboard/final-accounts
    │   ├── /dashboard/final-accounts/:accountId
    │   ├── /dashboard/procurement
    │   ├── /dashboard/inspections
    │   └── /dashboard/db-legend-cards
    ├── AI & Reports Workspace
    │   ├── /dashboard/ai-tools
    │   ├── /dashboard/ai-skills
    │   ├── /dashboard/projects-report/generator
    │   ├── /dashboard/projects-report/lighting
    │   ├── /dashboard/cost-reports
    │   └── /dashboard/cost-reports/:reportId
    ├── Communication Workspace
    │   ├── /dashboard/messages
    │   └── /dashboard/projects-report/handover
    └── Settings
        ├── /dashboard/project-settings
        ├── /dashboard/contact-library
        └── /dashboard/master-library
```

### Sidebar Configuration
The sidebar is organized into **5 workspace groups** defined in `src/components/sidebar/sidebarConfig.ts`:
1. **Core Project** — Dashboard, Roadmap, Project Outline, Tenant Tracker
2. **Technical Design** — Drawing Register, Cable Schedules, Bulk Services, Specifications, Electrical Budget
3. **Field Operations** — Site Diary, Floor Plan, BOQ, Final Accounts, Procurement, Inspections, DB Legend Cards
4. **AI & Reports** — AI Tools, AI Skills, Generator Report, Lighting Report, Cost Reports
5. **Communication** — Messages, Handover Documents

Settings items (My Settings, Project Settings) are displayed separately at the bottom.

### DashboardLayout Guards
`src/pages/DashboardLayout.tsx` enforces:
1. **Auth check** — Redirects to `/auth` if no session
2. **Project check** — Redirects to `/projects` if no `selectedProjectId` in localStorage
3. **Client contact check** — Blocks non-settings pages if project has no client contact assigned (via `useProjectClientCheck`)
4. **Password change** — Shows `FirstLoginModal` if `must_change_password` flag is set

---

## 5. Page-by-Page Breakdown

### 5.1 Landing Page (`/`)
**File:** `src/pages/Index.tsx`
**Purpose:** Marketing landing page with feature highlights.
**Components:** `src/components/landing/`
**Flow:** → `/auth` (login) or → `/projects` (if authenticated)

### 5.2 Auth (`/auth`)
**File:** `src/pages/Auth.tsx`
**Purpose:** Email/password login and signup with forgot-password flow.
**Flow:** Login success → `/projects`

### 5.3 Project Select (`/projects`)
**File:** `src/pages/ProjectSelect.tsx`
**Purpose:** List all projects the user is a member of. Create new projects.
**Data:** `project_members` → `projects` table join
**Components:** `src/components/projects/`, `CreateProjectDialog.tsx`
**Flow:** Select project → stores `selectedProjectId` in localStorage → `/dashboard`

### 5.4 Dashboard (`/dashboard`)
**File:** `src/pages/Dashboard.tsx`
**Purpose:** Project overview with summary cards, recent activity, progress metrics.
**Components:** `src/components/dashboard/`
**Data sources:** Aggregates from tenants, roadmap items, cable schedules, site diary tasks

### 5.5 Project Roadmap (`/dashboard/roadmap`)
**File:** `src/pages/ProjectRoadmap.tsx`
**Purpose:** Strategic milestone tracking with phases, priorities, assignments, due dates.
**Features:**
- Kanban board view
- Gantt chart grouping by phase
- Comments system (`useRoadmapComments`)
- External sharing via token-based review links
- Completion streaks and gamification
- Integration with Site Diary tasks (bi-directional)
- PDF export with phase-grouped tasks
**Related routes:**
- `/dashboard/roadmap-review` — Internal review mode
- `/roadmap-review/:token` — External stakeholder review (token-based)
- `/projects/:projectId/roadmap` — Deep link redirect to specific item

### 5.6 Project Outline (`/dashboard/project-outline`)
**File:** `src/pages/ProjectOutline.tsx`
**Purpose:** High-level project description, scope, and documentation.
**Components:** `src/components/project-outline/`

### 5.7 Tenant Tracker (`/dashboard/tenant-tracker`)
**File:** `src/pages/TenantTracker.tsx`
**Purpose:** Core module for managing retail/commercial tenants within a building project.
**Components:** `src/components/tenant/` (45+ components)
**Features:**
- Tenant CRUD with shop numbers, areas, types
- Generator sizing calculations (load factors 25–100%)
- Capital & running recovery calculators
- DB sizing rules & kW overrides with audit trail
- Document management per tenant (13 document types)
- Handover progress tracking per tenant
- QC inspections tab
- Version tracking (`tenant_schedule_versions` + `tenant_change_audit_log`)
- Notification system for tenant data changes
- Import from Excel and from electrical budgets
- PDF report generation (generator report, tenant report)
- Floor plan masking and legend
**Key triggers:**
- `log_tenant_change()` — Audits all tenant modifications, increments version, sends notifications
- `log_kw_override_change()` — Tracks manual kW override history
- `sync_tenant_document_status()` — Auto-updates tenant flags when documents uploaded/deleted

### 5.8 Drawing Register (`/dashboard/drawings`)
**File:** `src/pages/DrawingRegister.tsx`
**Purpose:** Manage electrical engineering drawings with revision tracking.
**Components:** `src/components/drawings/`
**Features:**
- Drawing CRUD with number, title, discipline, status, revision
- Auto-category detection from drawing number (`detect_drawing_category()`)
- Table and grid views
- Bulk import from Excel
- Review workflow (submit → review → approve/reject)
- Dropbox sync integration
- Sync to Roadmap functionality
- Admin review dashboard
**Edge functions:** `sync-drawings` (Dropbox sync)

### 5.9 Cable Schedules (`/dashboard/cable-schedules`, `/dashboard/cable-schedules/:id`)
**File:** `src/pages/CableSchedules.tsx`, `src/pages/CableScheduleDetail.tsx`
**Purpose:** Core electrical engineering tool for cable sizing, scheduling, and cost tracking.
**Components:** `src/components/cable-schedules/` (30+ components)
**Features:**
- Cable entry management with auto-sizing calculations
- Cable sizing engine (`src/utils/cableSizing.ts`) with SANS 10142-1 compliance
- Cable optimization (`src/utils/cableOptimization.ts`)
- Grouped cable table with virtualization for performance
- Cable rates manager with supply/install cost tracking
- Cost summary with material totals
- Import from Excel, from tenants, from floor plans
- Split parallel cables dialog
- Calculation settings (voltage drop %, derating factors)
- Report generation and history
- Site verification portal integration
- PDF export
- Offline sync (`useCableOfflineSync`)
**Validation trigger:** `validate_cable_entry()` — Rejects invalid cable tags and locations

### 5.10 Bulk Services (`/dashboard/bulk-services`)
**File:** `src/pages/BulkServices.tsx`
**Purpose:** 6-phase workflow for utility-grade power supply applications.
**Components:** `src/components/bulk-services/` with `phases/` subdirectory
**Phases:**
1. **Load Estimation** — Connected loads, peak demand, diversity factor, future growth, load profile
2. **Bulk Requirements** — Supply voltage, substation, transformer sizing, protection, cables, switchgear
3. **Utility Application** — Formal application, max demand docs, voltage request, tariff selection
4. **Design & Approval** — Utility review, network assessment, technical drawings, connection agreement
5. **Construction** — Internal infrastructure, spec compliance, grid extension, testing/commissioning
6. **Operations** — Power factor, demand management, equipment maintenance, reporting
**Data:** `bulk_services_documents`, `bulk_services_workflow_phases`, `bulk_services_workflow_tasks`
**Features:**
- Step-by-step guided workflow with form components per task
- Phase progress tracking with completion percentages
- Workflow summary dashboard
- SANS 204 and SANS 10142 calculation support
- Climatic zone mapping (Mapbox integration)
- External meter linking
- AI guidance parameters
- PDF report generation

### 5.11 Specifications (`/dashboard/specifications`, `/dashboard/specifications/:id`)
**File:** `src/pages/Specifications.tsx`, `src/pages/SpecificationDetail.tsx`
**Purpose:** Technical specification document management.
**Components:** `src/components/specifications/`

### 5.12 Electrical Budget (`/dashboard/budgets/electrical`, `/dashboard/budgets/electrical/:id`)
**File:** `src/pages/ElectricalBudgets.tsx`, `src/pages/ElectricalBudgetDetail.tsx`
**Purpose:** Detailed electrical cost budgeting with sections and line items.
**Components:** `src/components/budgets/`
**Features:**
- Budget sections with item codes
- Line items with supply/install rates, area-based calculations
- Tenant-specific items
- Master material library linking
- Master rate library linking
- Reference drawing uploads
- Offline sync (`useBudgetOfflineSync`)

### 5.13 Site Diary (`/dashboard/site-diary`)
**File:** `src/pages/SiteDiary.tsx`
**Purpose:** Daily construction task management and progress tracking.
**Components:** `src/components/site-diary/` (Kanban board, Gantt chart, dashboard, task views)
**Features:**
- Task CRUD with status (todo, in-progress, done), priority, assignments
- Kanban board view (drag & drop via @dnd-kit)
- Gantt chart with roadmap phase grouping
- Meeting minutes
- Reminders panel
- Roadmap integration (tasks link to roadmap items)
- Task assignment notifications (`notify_task_assignment()` trigger)
- Offline sync (`useOfflineSiteDiary`)

### 5.14 Floor Plan Markup (`/dashboard/floor-plan`)
**File:** `src/pages/FloorPlan.tsx`
**Purpose:** Interactive floor plan annotation and cable route visualization.
**Components:** `src/components/floor-plan/`
**Features:**
- Fabric.js canvas for drawing/annotation
- Cable route overlays
- Tenant masking
- Scale calibration
- Import cables from floor plan into cable schedules
- Zoom/pan controls (react-zoom-pan-pinch)

### 5.15 BOQ (Bill of Quantities) (`/dashboard/boqs`, `/dashboard/boqs/:boqId`, `/dashboard/boq/:uploadId`)
**File:** `src/pages/BOQs.tsx`, `src/pages/BOQProjectDetail.tsx`, `src/pages/BOQDetail.tsx`
**Purpose:** Bill of quantities management with Excel import and rate matching.
**Components:** `src/components/boq/`
**Features:**
- Project BOQ with bills → sections → items hierarchy
- BOQ item types: quantity, prime_cost, percentage, sub_header
- Auto-calculation triggers (`calculate_boq_item_amount()`, `calculate_boq_item_costs()`)
- Cascading total updates (items → sections → bills → project BOQ)
- Excel upload with AI-powered extraction (`extract-boq-rates`, `extract-boq-template-structure`)
- Master material matching with confidence scoring
- Section templates from standard BOQ sections
- Import/export functionality

### 5.16 Final Accounts (`/dashboard/final-accounts`, `/dashboard/final-accounts/:id`)
**File:** `src/pages/FinalAccounts.tsx`, `src/pages/FinalAccountDetail.tsx`
**Purpose:** Final account reconciliation (contract vs actual costs).
**Components:** `src/components/final-accounts/`
**Features:**
- Bills → sections → items structure
- Contract quantity vs final quantity tracking
- Variation tracking
- Full audit history (`log_final_account_item_change()` trigger)
- Cascading total calculations (`update_bill_totals()`)

### 5.17 Cost Reports (`/dashboard/cost-reports`, `/dashboard/cost-reports/:id`)
**File:** `src/pages/CostReports.tsx`, `src/pages/CostReportDetail.tsx`
**Purpose:** Financial reporting — Original Budget vs Previous vs Anticipated Final Cost.
**Components:** `src/components/cost-reports/` (22+ components)
**Features:**
- Cost categories with line items
- Variations manager (credits & debits)
- Variation audit history (`log_variation_change()` trigger)
- Report comparison across revisions
- Cover page manager
- Excel import
- PDF export (SVG-based engine with Navy/Blue palette)
- Template system with placeholder detection

### 5.18 Procurement (`/dashboard/procurement`)
**File:** `src/pages/Procurement.tsx`
**Purpose:** Material and equipment procurement tracking.
**Components:** `src/components/procurement/`
**Features:**
- Procurement items with status tracking (requested → ordered → delivered)
- Status history audit (`log_procurement_status_change()` trigger)
- Auto-creation of roadmap items (`create_procurement_roadmap_item()` trigger)
- Auto-sync to roadmap completion (`sync_procurement_to_roadmap()` trigger)
- Contractor portal visibility

### 5.19 Inspections (`/dashboard/inspections`)
**File:** `src/pages/Inspections.tsx`
**Purpose:** Quality control and compliance inspection management.
**Components:** `src/components/procurement/inspections/`

### 5.20 DB Legend Cards (`/dashboard/db-legend-cards`)
**File:** `src/pages/DBLegendCards.tsx`
**Purpose:** Distribution board legend card creation and submission workflow.
**Components:** `src/components/db-legend-cards/`
**Features:**
- Card creation with circuit/contactor data
- Submission workflow: Draft → Submitted → Approved/Rejected
- Batch approval/rejection from admin dashboard
- Email notifications on submission/approval/rejection (`send-legend-card-notification`)
- Inline data viewer for reviewers
- Contractor portal integration (submit from contractor portal)

### 5.21 Generator Report (`/dashboard/projects-report/generator`)
**File:** `src/pages/GeneratorReport.tsx`
**Purpose:** Generator sizing calculations based on tenant loads.
**Components:** `src/components/tenant/Generator*.tsx`
**Features:**
- Load factor analysis (25%, 50%, 75%, 100%)
- Generator sizing table per tenant
- Cost settings (fuel, rental, maintenance)
- Capital & running recovery calculations
- PDF report generation
- Client sharing via token links
- Saved reports list
**Calculation engine:** `src/utils/generatorSizing.ts`

### 5.22 Lighting Report (`/dashboard/projects-report/lighting`)
**File:** `src/pages/LightingReport.tsx`
**Purpose:** Lighting load analysis and recommendations.
**Components:** `src/components/lighting/`
**Edge functions:** `lighting-recommendations`, `lighting-insights`, `extract-lighting-specs`

### 5.23 AI Tools (`/dashboard/ai-tools`)
**File:** `src/pages/AITools.tsx`
**Purpose:** AI-powered assistant for engineering queries.
**Components:** `src/components/ai-tools/`
**Edge functions:** `ai-chat`, `ai-analyze-data`, `ai-predict-costs`, `ai-generate-document`

### 5.24 AI Skills (`/dashboard/ai-skills`)
**File:** `src/pages/AISkills.tsx`
**Purpose:** Manage reusable AI skill definitions (prompts, instructions) for the AI tools.
**Components:** `src/components/ai-skills/`
**Data:** `ai_skills` table

### 5.25 Messages (`/dashboard/messages`)
**File:** `src/pages/Messages.tsx`
**Purpose:** Internal team messaging system.
**Components:** `src/components/messaging/`
**Features:**
- Conversations with participants
- Real-time messaging via Supabase Realtime
- Reactions with analytics
- Edit/soft-delete messages
- Read receipts
- Search, pinning, threads
- Message templates with `/shortcut` support
- Archiving
- Translation
- @mentions
- Delivery status indicators
- Draft autosave (24h expiry)
- Voice messages (recording/playback)
- Forwarding and scheduling
- Push notifications (Service Worker + VAPID)
- Typing indicators
- Notification bell in header (`MessageNotificationBell`)
**Hooks:** `useConversations`, `useMessages`, `useUnreadMessages`, `useTypingIndicator`, `useDraftMessage`, `useOfflineMessageQueue`

### 5.26 Handover Documents (`/dashboard/projects-report/handover`)
**File:** `src/pages/HandoverDocuments.tsx`
**Purpose:** Manage project handover documentation organized in folders.
**Components:** `src/components/handover/`
**Features:**
- Folder hierarchy with path tracking (`update_folder_path()` trigger)
- File uploads to Supabase Storage
- Client-facing handover portal
- Per-tenant handover progress tracking (`useTenantHandoverProgress`)

### 5.27 Project Settings (`/dashboard/project-settings`)
**File:** `src/pages/ProjectSettings.tsx`
**Purpose:** Project-level configuration.
**Components:** `src/components/project-settings/`

### 5.28 Contact Library (`/dashboard/contact-library`)
**File:** `src/pages/DashboardContactLibrary.tsx`
**Purpose:** Project-scoped contact directory. Required before other pages become accessible.

### 5.29 Master Library (`/dashboard/master-library` or `/master-library`)
**File:** `src/pages/MasterLibrary.tsx`
**Purpose:** Global master materials and rates library.
**Components:** `src/components/master-library/`
**Features:**
- Master materials with categories
- Standard supply/install costs
- Price audit trail (`log_material_price_change()` trigger)
- Usage counting (`increment_material_usage()` trigger)
- Rate sources with confidence scoring
- Rate analytics views (by contractor, by province)

---

## 6. Component Architecture

### Top-Level Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `App.tsx` | Root | Provider tree, router, global UI |
| `AppSidebar.tsx` | Layout | Main navigation sidebar (workspaces) |
| `AdminSidebar.tsx` | Layout | Admin navigation sidebar |
| `DashboardLayout.tsx` | Layout | Auth guard, project header, content outlet |
| `AdminLayout.tsx` | Layout | Admin auth guard and layout |
| `ProjectDropdown.tsx` | Header | Quick project switching |
| `ErrorBoundary.tsx` | Global | Catch and display React errors |

### Component Organization
```
src/components/
├── ui/           → shadcn/ui primitives (Button, Card, Dialog, etc.)
├── layout/       → PageLayout, PageContent, PageHeader
├── common/       → Shared utilities (ProjectContextHeader, PageLoadingSpinner)
├── sidebar/      → Sidebar config and components
├── auth/         → FirstLoginModal
├── landing/      → Landing page sections
├── [domain]/     → Domain-specific components (50+ domains)
├── walkthrough/  → Tour system components
├── pwa/          → PWA install, update, offline indicators
└── native/       → Capacitor native bridge components
```

### Shared UI Patterns
- **PageLayout** wraps all dashboard pages with consistent padding/structure
- **ProjectContextHeader** shows project name + number across all dashboard pages
- **Rich tooltips** (`InfoTooltip`, `ChartTooltip`, `VideoTooltip`, `ActionTooltip`, `HelpTooltip`)
- **Form field tooltips** (`FormFieldTooltip`, `FormLabelWithHelp`)
- **Data tables** with sort, filter, and export capabilities

---

## 7. Custom Hooks Library

### Data Fetching Hooks (TanStack Query Pattern)
| Hook | Purpose |
|------|---------|
| `useProject` / `useProjects` | Project CRUD |
| `useConversations` | Messaging conversations |
| `useMessages` | Message CRUD and realtime |
| `useUnreadMessages` | Unread message counts |
| `useAISkills` | AI skill definitions |
| `useDocumentation` | Application docs |
| `useEmailTemplates` | Email template management |
| `useKnowledgeBase` | Knowledge base documents |
| `usePRDs` | Product requirement documents |
| `useProjectDrawings` | Drawing register data |
| `useDrawingChecklists` | Drawing review checklists |
| `useRoadmapComments` | Roadmap item comments |
| `useTenantHandoverProgress` | Per-tenant handover status |
| `useMunicipalityQuery` | Municipality lookups |
| `useCompletionStreak` | Gamification streaks |

### State & Performance Hooks
| Hook | Purpose |
|------|---------|
| `useLocalStorage` / `useSessionStorage` | Persistent browser state |
| `useDebounce` / `useDebouncedCallback` / `useThrottledCallback` | Input optimization |
| `useMemoizedCallback` | Stable callback references |
| `usePaginatedQuery` | Paginated data fetching |
| `useOptimizedQuery` | Query deduplication & optimization |

### Offline & Sync Hooks
| Hook | Purpose |
|------|---------|
| `useOfflineSync` | Generic offline queue |
| `useCableOfflineSync` | Cable entry offline storage |
| `useBudgetOfflineSync` | Budget line item offline storage |
| `useDrawingOfflineSync` | Drawing offline storage |
| `useOfflineSiteDiary` | Site diary offline tasks |
| `useOfflineMessageQueue` | Queued messages for offline |
| `useOfflineHandover` | Handover docs offline |
| `useNetworkStatus` | Online/offline detection |
| `useBackgroundSync` | Background sync on reconnect |
| `useConflictDetection` | Optimistic update conflict resolution |

### UI & Interaction Hooks
| Hook | Purpose |
|------|---------|
| `use-mobile` | Mobile viewport detection |
| `useImageCompression` | Client-side image optimization |
| `useImageLoader` | Lazy image loading with format detection |
| `useGeolocation` | GPS coordinates (for cable verification) |
| `useIdleTracker` | Idle user detection |
| `usePWAInstall` | PWA install prompt management |
| `useNativeApp` | Capacitor native features |
| `useNativeKeyboard` | Mobile keyboard handling |
| `useNativePushNotifications` | Native push notification registration |
| `useHaptics` | Haptic feedback (via Capacitor) |

### Auth & Access Hooks
| Hook | Purpose |
|------|---------|
| `useRoleAccess` | Role-based access control |
| `useUserRole` | Current user's role |
| `useClientAccess` | Client portal access validation |
| `useSessionMonitor` | Auto-logout on session expiry |
| `useActivityLogger` | User activity tracking |

### Dropbox Integration Hooks
| Hook | Purpose |
|------|---------|
| `useDropbox` | Dropbox API connection |
| `useDropboxActivityLogs` | Sync activity history |
| `useDropboxTempLink` | Temporary file access links |
| `useProjectDropboxFolder` | Project folder mapping |
| `useDrawingFileUpload` | Drawing file upload to Dropbox |

---

## 8. Edge Functions (Backend)

### AI Functions
| Function | Purpose |
|----------|---------|
| `ai-chat` | AI conversational assistant |
| `ai-analyze-data` | Data analysis with AI |
| `ai-predict-costs` | Cost prediction models |
| `ai-generate-document` | Document generation |
| `ai-review-application` | Application review |
| `lighting-recommendations` | AI lighting design advice |
| `lighting-insights` | Lighting analysis |
| `search-knowledge` | Knowledge base semantic search |
| `embed-document` | Generate embeddings for knowledge docs |

### Notification Functions
| Function | Purpose |
|----------|---------|
| `send-message-notification` | New message email alerts |
| `send-push-notification` | Browser push notifications |
| `send-client-portal-notification` | Client portal activity emails |
| `send-legend-card-notification` | DB legend card status emails |
| `send-cable-verification-email` | Cable verification completion emails |
| `send-cable-verification-notification` | Verification activity alerts |
| `send-drawing-review-notification` | Drawing review status emails |
| `send-roadmap-assignment-notification` | Roadmap task assignment emails |
| `send-roadmap-comment-notification` | Roadmap comment emails |
| `send-roadmap-completion-notification` | Milestone completion emails |
| `send-roadmap-due-date-notification` | Due date reminder emails |
| `send-roadmap-review-update` | External review update emails |
| `send-roadmap-share-invitation` | Share link invitation emails |
| `send-status-update-notification` | General status updates |
| `send-approval-notification` | Approval workflow emails |
| `send-deadline-notification` | Deadline reminder emails |
| `send-feedback-response` | Feedback response emails |
| `send-invoice-reminder` | Invoice payment reminders |
| `send-item-shared-notification` | Shared item notifications |
| `send-rfi-notification` | RFI notification emails |
| `send-section-review-email` | Section review emails |
| `send-review-findings` | Review findings emails |
| `send-review-status-notification` | Review status change emails |
| `send-scheduled-report` | Scheduled report delivery |
| `send-weekly-streak-summary` | Weekly gamification summary |
| `send-generator-report-share` | Generator report share emails |
| `send-portal-summary-email` | Portal summary emails |
| `notify-admin-feedback` | Admin feedback alerts |
| `notify-expiring-portal-tokens` | Expiring token warnings |
| `check-tenant-notifications` | Tenant deadline checks |
| `process-roadmap-notifications` | Batch roadmap notification processing |
| `populate-tenant-deadlines` | Auto-set tenant deadlines |

### Extraction & Processing Functions
| Function | Purpose |
|----------|---------|
| `extract-boq-rates` | Extract rates from BOQ uploads |
| `extract-boq-template-structure` | Parse BOQ template structure |
| `extract-budget` | Parse budget documents |
| `extract-invoice-pdf` | Invoice PDF data extraction |
| `extract-lighting-specs` | Lighting specification parsing |
| `extract-payment-schedule` | Payment schedule extraction |
| `match-boq-rates` | Match extracted items to master materials |
| `scan-circuit-layout` | Circuit layout scanning |
| `scan-invoice` | Invoice scanning |
| `analyze-pdf-issue` | PDF quality analysis |
| `analyze-pdfmake` | PDFMake compatibility check |
| `convert-word-to-pdf` | Word → PDF conversion |

### User Management Functions
| Function | Purpose |
|----------|---------|
| `invite-user` | Send user invitation with temp password |
| `set-user-password` | Admin set user password |
| `reset-user-password` | Password reset flow |
| `admin-reset-password` | Admin-initiated password reset |

### Integration Functions
| Function | Purpose |
|----------|---------|
| `dropbox-auth` | Dropbox OAuth initiation |
| `dropbox-exchange-code` | Dropbox OAuth code exchange |
| `dropbox-oauth-callback` | Dropbox OAuth callback handler |
| `dropbox-api` | Dropbox API proxy |
| `get-mapbox-token` | Secure Mapbox token retrieval |
| `google-sheets-sync` | Google Sheets data sync |
| `fetch-external-meters` | External meter data fetching |
| `fetch-greencalc-tariffs` | GreenCalc tariff data |
| `fetch-tenant-schedule` | Tenant schedule data for portals |
| `sync-load-profiles` | Load profile synchronization |
| `sync-drawings` | Dropbox drawing sync |
| `query-municipality` | Municipality database query |

### System Functions
| Function | Purpose |
|----------|---------|
| `backup-database` | Database backup creation |
| `restore-backup` | Database restore |
| `generate-boq` | BOQ document generation |
| `generate-component` | Dynamic component generation |
| `generate-infographic` | Infographic image generation |
| `run-scheduled-review` | Scheduled code review |
| `analyze-repository` | Repository analysis |
| `agent-gateway` | AI agent API gateway |
| `replicate-schema` | Schema replication to target DB |
| `run-target-sql` | Execute SQL on target DB |
| `discover-external-schema` | External DB schema discovery |

---

## 9. Database Schema & Functions

### Key Tables (300+ total)
**Project Core:**
- `projects` — Project definitions
- `project_members` — User-project assignments with roles/positions
- `project_roadmap_items` — Milestones and tasks
- `project_roadmap_comments` — Comments on roadmap items

**Tenants:**
- `tenants` — Tenant/shop data with loads, areas, statuses
- `tenant_documents` — Per-tenant document uploads
- `tenant_schedule_versions` — Version tracking
- `tenant_change_audit_log` — Full change audit
- `tenant_kw_override_audit` — kW override history

**Cable Schedules:**
- `cable_schedules` — Schedule definitions per project
- `cable_entries` — Individual cable records with sizing data
- `cable_sizing_references` — Reference tables for calculations

**Electrical Budget:**
- `electrical_budgets` → `budget_sections` → `budget_line_items`
- `budget_reference_drawings`

**BOQ:**
- `project_boqs` → `boq_bills` → `boq_project_sections` → `boq_items`
- `boq_uploads` → `boq_extracted_items`
- `boq_section_templates`, `boq_item_templates`

**Cost Reports:**
- `cost_reports` → `cost_categories` → `cost_line_items`
- `cost_variations` → `cost_variation_history`

**Final Accounts:**
- `final_accounts` → `final_account_bills` → `final_account_sections` → `final_account_items`
- `final_account_item_history`

**Bulk Services:**
- `bulk_services_documents` — Main document with all calculation data
- `bulk_services_workflow_phases` → `bulk_services_workflow_tasks`
- `bulk_services_sections`, `bulk_services_reports`
- `bulk_services_tutorial_progress`, `bulk_services_workflow_snapshots`

**Messaging:**
- `conversations` → `messages`
- `message_reactions`, `message_read_receipts`
- `archived_conversations`

**Portals:**
- `client_portal_tokens`, `client_portal_access_log`
- `contractor_portal_tokens`, `contractor_portal_access_log`
- `cable_verification_tokens`, `cable_verifications`
- `client_project_access`

**Materials:**
- `master_materials` → `material_categories`
- `material_rate_sources`, `material_price_audit`
- `master_rate_library`, `rate_change_audit`

**HR & Staff:**
- `employees`, `attendance_records`, `benefits`

**System:**
- `profiles` — User profiles with login stats
- `user_roles` — Role assignments
- `user_activity_logs` — Action tracking
- `status_notifications` — In-app notifications
- `notification_queue`, `notification_preferences`
- `backup_jobs`, `backup_history`, `backup_files`, `backup_health_checks`
- `application_documentation`, `application_reviews`
- `ai_skills`, `ai_prediction_reports`
- `knowledge_documents`, `knowledge_chunks` (vector search)

### Key Database Functions
| Function | Purpose |
|----------|---------|
| `is_admin(user_id)` | Check admin role |
| `has_project_access(user_id, project_id)` | Check project membership |
| `user_has_project_access(_project_id)` | Current user project check (for RLS) |
| `client_has_project_access(user_id, project_id)` | Client portal access check |
| `has_valid_client_portal_token(project_id)` | Check valid client token exists |
| `has_valid_contractor_portal_token(project_id)` | Check valid contractor token exists |
| `validate_client_portal_token(token)` | Validate and log client token access |
| `validate_contractor_portal_token(token)` | Validate and log contractor token access |
| `generate_client_portal_token(project_id, email)` | Create client portal token |
| `validate_portal_short_code(code)` | Validate short code for `/p/:code` redirect |
| `log_tenant_change()` | Tenant audit trigger |
| `log_final_account_item_change()` | Final account audit trigger |
| `log_variation_change()` | Cost variation audit trigger |
| `log_material_price_change()` | Material price audit trigger |
| `log_procurement_status_change()` | Procurement status audit trigger |
| `calculate_boq_item_amount()` | BOQ item cost calculation trigger |
| `update_boq_section_totals()` | Cascading BOQ totals |
| `update_boq_bill_totals()` | Cascading BOQ totals |
| `update_bill_totals()` | Final account cascading totals |
| `increment_tenant_schedule_version()` | Tenant version tracking |
| `update_completion_streak()` | Gamification streak tracking |
| `match_knowledge_chunks(embedding)` | Vector similarity search |
| `queue_roadmap_due_notifications(days)` | Batch queue due date notifications |

---

## 10. Utility Libraries

### `src/utils/`
| Module | Purpose |
|--------|---------|
| `cableSizing.ts` | Cable sizing calculations (SANS 10142-1) |
| `cableOptimization.ts` | Cable route optimization |
| `cableValidation.ts` | Cable entry validation rules |
| `generatorSizing.ts` | Generator sizing from tenant loads |
| `costReportCalculations.ts` | Cost report math |
| `dateCalculations.ts` | Date utilities for deadlines |
| `decimalPrecision.ts` | Decimal.js wrappers for financial math |
| `formatters.ts` | Number/currency/date formatters |
| `tenantSorting.ts` | Tenant list sorting |
| `excelParser.ts` | Excel file parsing (xlsx) |
| `pdfConstants.ts` | PDF styling constants |
| `pdfStyleManager.ts` | PDF style management |
| `pdfQualitySettings.ts` | PDF quality configuration |
| `pdfFilenameGenerator.ts` | Smart PDF filename generation |
| `pdfComplianceChecker.ts` | PDF compliance validation |
| `placeholderDetection.ts` | Template placeholder detection |

### `src/lib/`
| Module | Purpose |
|--------|---------|
| `utils.ts` | `cn()` classname merger (clsx + tailwind-merge) |
| `validation.ts` | Input validation helpers |
| `passwordValidation.ts` | Password strength rules |
| `csvExport.ts` | CSV export utility |
| `conflictResolution.ts` | Optimistic update conflict handling |
| `errorHandling.ts` | Standardized error handling |
| `fileViewer.ts` | File preview utilities |
| `offlineStorage.ts` | IndexedDB offline storage |
| `storageQuota.ts` | Storage quota monitoring |
| `queryOptimization.ts` | Query deduplication |
| `assetOptimization.ts` | Image/asset lazy loading |

---

## 11. External Portals & Token-Based Access

### Client Portal (`/client-portal`)
**Auth:** Token-based (generated via `generate_client_portal_token()`)
**Access:** Read-only project reports, approval/rejection, comments
**Components:** `src/components/client-portal/`
**Sub-pages:**
- `/client/tenant-report/:projectId` — Tenant schedule report
- `/client/generator-report/:projectId` — Generator sizing report
- `/client/documents/:projectId` — Document downloads
- `/client-view` — General client view
**Features:** Approval workflow, comments, feedback form, FAQ, review checklist, section review status

### Contractor Portal (`/contractor-portal`)
**Auth:** Token-based with short codes (validated via `validate_contractor_portal_token()`)
**Access:** Structured project data access for contractors
**Components:** `src/components/contractor-portal/`
**Tabs:** Dashboard, Tenants, Drawing Register, Procurement, Cable Status, Inspections, DB Legend Cards, RFIs
**Features:** 
- Token types for different contractor roles
- Short code access via `/p/:code` redirect
- Drawing register with revision history
- Procurement status tracking
- Cable schedule read access
- Inspection request submission
- DB legend card submission
- RFI management
- Deadline export

### Cable Verification Portal (`/cable-verification`)
**Auth:** Token-based (secure UUID tokens)
**Access:** Mobile-optimized site verification
**Components:** `src/components/cable-verification/`
**Features:**
- Batch verification actions (Verified/Issue/Not Installed)
- Photo upload evidence
- GPS capture (lat/lng/accuracy)
- Electrician credentials capture (ECSA/SAIEE)
- Digital signature (HTML5 canvas)
- Verification Certificate PDF generation

### Handover Portals
- `/handover-client` — Client document access
- `/handover-client-management` — Admin handover management

### Review Portals
- `/review/:accessToken` — Contractor review portal
- `/roadmap-review/:token` — External roadmap review
- `/generator-report/:token` — Shared generator report view

---

## 12. PWA & Offline Capabilities

### Service Worker
- Registered via `vite-plugin-pwa`
- Caches static assets and API responses
- Background sync on reconnect

### Offline Storage
- **IndexedDB** via `src/lib/offlineStorage.ts` (with `fake-indexeddb` for testing)
- Per-module offline queues: cables, budgets, drawings, messages, site diary, handover

### Offline Indicators
- `OfflineIndicator` — Global banner when offline
- `StorageWarningBanner` — Storage quota warnings
- `useNetworkStatus` — Hook for online/offline state

### Capacitor Native Features
| Plugin | Usage |
|--------|-------|
| Camera | Photo capture for inspections, verification |
| Filesystem | Local file storage |
| Haptics | Tactile feedback |
| Push Notifications | Native push registration |
| Share | Native share sheet |
| Splash Screen | App launch screen |
| Status Bar | Status bar styling |
| Local Notifications | Scheduled local alerts |
| Network | Network status detection |
| Keyboard | Keyboard handling |

---

## 13. PDF Generation & Reporting Engine

### Architecture
```
Component (Data) → Registration (Layout) → Engine (Render)
```

### Engines
- **Primary:** `src/utils/pdfmake/engine` (Unified PdfMake engine)
- **SVG-PDF:** `src/utils/svg-pdf/` (SVG-based rendering)
- **Legacy:** jsPDF + jsPDF-AutoTable (being phased out)
- **pdf-lib:** Used for PDF manipulation (merge, edit)

### Design Standards
- Navy/Blue palette
- Rounded background cards
- Consistent header/footer
- Company logo integration
- Cover page system
- Visual parity with Cost Report standard

### Report Types
| Report | Engine | Export |
|--------|--------|--------|
| Cost Report | SVG-PDF | PDF |
| Generator Report | PdfMake | PDF |
| Tenant Report | PdfMake | PDF |
| Cable Schedule | PdfMake | PDF |
| BOQ Export | PdfMake | PDF |
| Bulk Services | PdfMake | PDF |
| Roadmap Export | PdfMake | PDF |
| Verification Certificate | PdfMake | PDF |
| Final Account | PdfMake | PDF |
| Floor Plan Annotations | html2canvas | Image |

### Template System
- `document_templates` table for cover pages
- `pdf_template_configs` for layout settings
- Placeholder detection and insertion
- Default cover enforcement (`ensure_single_default_cover()` trigger)

---

## 14. Messaging & Notifications

### In-App Messaging
- Real-time via Supabase Realtime (postgres_changes)
- Conversations → Messages hierarchy
- Full feature set: reactions, threads, read receipts, mentions, templates, voice, drafts, forwarding, scheduling
- Translation support
- Archive support

### Email Notifications
- Sent via **Resend** API from Edge Functions
- HTML email templates
- Rate limiting (500ms stagger for batch operations)
- Categories: roadmap, portal, verification, invoicing, feedback, status updates

### Push Notifications
- Browser: Service Worker + VAPID keys
- Native: Capacitor Push Notifications plugin
- Edge function: `send-push-notification`

### In-App Notifications
- `status_notifications` table
- Notification bell component (`MessageNotificationBell`)
- Types: task_assigned, status_update, roadmap updates, tenant changes

### Scheduled Notifications
- `notification_queue` table with scheduling
- `notification_preferences` for user opt-in/out
- Roadmap due date reminders (`queue_roadmap_due_notifications()`)
- Expiring portal token warnings
- Weekly streak summaries

---

## 15. AI Integration

### Supported Models (via Lovable AI — no API key needed)
- Google Gemini 2.5/3 (Pro, Flash, Flash-Lite)
- OpenAI GPT-5/5-mini/5-nano/5.2

### AI Features
| Feature | Edge Function | Purpose |
|---------|--------------|---------|
| Chat Assistant | `ai-chat` | Engineering Q&A |
| Data Analysis | `ai-analyze-data` | Analyze project data |
| Cost Prediction | `ai-predict-costs` | Predict project costs |
| Document Generation | `ai-generate-document` | Generate docs from data |
| Application Review | `ai-review-application` | Automated application review |
| Lighting Recommendations | `lighting-recommendations` | Lighting design advice |
| Lighting Insights | `lighting-insights` | Lighting load analysis |
| BOQ Rate Extraction | `extract-boq-rates` | Parse BOQ documents |
| BOQ Rate Matching | `match-boq-rates` | Match to master library |
| Knowledge Search | `search-knowledge` | Semantic document search |
| Document Embedding | `embed-document` | Vector embeddings for RAG |

### Knowledge Base (RAG)
- `knowledge_documents` — Source documents
- `knowledge_chunks` — Chunked content with vector embeddings
- `match_knowledge_chunks()` — pgvector similarity search
- Used by AI chat for context-aware responses

---

## 16. Walkthrough & Onboarding System

### Architecture
**Components:** `src/components/walkthrough/`
**Tours:** `src/components/walkthrough/tours/` (10 page-specific tours)
**Walkthroughs:** `src/components/walkthrough/walkthroughs/`

### Tour Registry
| Tour | Route | Category |
|------|-------|----------|
| Projects | `/projects` | Getting Started |
| Dashboard | `/dashboard` | Getting Started |
| Cable Schedule | `/dashboard/cable-schedules` | Core Features |
| Libraries | `/master-library` | Core Features |
| Floor Plan | `/dashboard/floor-plan` | Core Features |
| Reports | `/dashboard/cost-reports` | Reports & Documents |
| Generator | `/dashboard/projects-report/generator` | Reports & Documents |
| Client Portal | `/client-portal` | Collaboration |
| Admin Portal | `/admin` | Administration |
| Settings | `/settings` | Administration |

### Features
- Step-by-step guided tours per page
- Spotlight overlay highlighting target elements
- Tooltips with rich content (text, video, actions)
- Progress tracking
- Help button (global)
- Feature highlight badges for new features
- Beacon indicators for discoverable features

---

## 17. Inter-Page Communication & Data Flow

### Cross-Page Data Dependencies
```
Tenants ←→ Generator Report (load calculations)
Tenants ←→ Cable Schedules (import tenants as cable destinations)
Tenants ←→ Electrical Budget (import tenants, link line items)
Tenants ←→ Cost Reports (tenant-specific variations)
Tenants ←→ BOQ (tenant-specific items)
Tenants ←→ Handover (per-tenant document progress)

Roadmap ←→ Site Diary (tasks link to milestones)
Roadmap ←→ Procurement (auto-create roadmap items)
Roadmap ←→ Drawing Register (sync to roadmap)

Cable Schedules ←→ Floor Plan (import cables from markup)
Cable Schedules ←→ Cable Verification Portal (site verification)

Master Library ←→ Budget Line Items (rate linking)
Master Library ←→ BOQ Items (material matching)

Drawings ←→ Contractor Portal (drawing register access)
Drawings ←→ Dropbox (sync integration)

Cost Reports ←→ Final Accounts (variation tracking)
```

### State Sharing Mechanisms
1. **localStorage** — `selectedProjectId` (global project context)
2. **URL params** — `:scheduleId`, `:reportId`, `:boqId`, etc. (detail views)
3. **TanStack Query cache** — Shared across components via query keys
4. **Supabase Realtime** — Live updates for messages, presence
5. **Custom events** — `projectChanged` event for cross-component project switching
6. **React Context** — `ConflictProvider`, `WalkthroughProvider`

### Trigger-Driven Automation
```
Tenant Change → log_tenant_change() → version increment + notifications
BOQ Item Change → calculate_boq_item_amount() → section totals → bill totals → project total
Procurement Created → create_procurement_roadmap_item() → roadmap item
Procurement Status → sync_procurement_to_roadmap() → roadmap completion
Document Upload → sync_tenant_document_status() → tenant flag updates
Material Price Change → log_material_price_change() → audit trail
Roadmap Completion → update_roadmap_completion_streak() → gamification
Message Reply → update_message_reply_count() → thread counter
```

---

## 18. Security Model

### Row-Level Security (RLS)
All tables have RLS enabled with policies based on:
- `auth.uid()` — Current authenticated user
- `is_admin()` — Admin role check
- `has_project_access()` — Project membership check
- `user_has_project_access()` — Combined admin + member check
- `client_has_project_access()` — Client portal access
- `has_valid_client_portal_token()` — Token-based portal access
- `has_valid_contractor_portal_token()` — Contractor token access

### Token Security
- Tokens generated with `gen_random_bytes(32)` → hex encoding
- Short codes generated from MD5 hash (8 chars uppercase)
- All tokens have expiration timestamps
- Access logging with IP address and user agent
- Token access counting

### Data Protection
- Passwords never stored in client code
- Service role keys never in frontend
- API keys stored as Supabase secrets (env vars)
- Edge functions use CORS headers
- Storage buckets have per-bucket policies

### Audit Trail
Complete audit logging across:
- Tenant changes (version + field-level diff)
- Material price changes (% change tracking)
- BOQ rate changes
- Final account item changes (insert/update/delete)
- Cost variation changes
- Procurement status changes
- kW override changes
- User login activity
- Portal access logs

---

*End of Master Document*
