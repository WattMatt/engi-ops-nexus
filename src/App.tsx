import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WalkthroughProvider } from "@/components/walkthrough/WalkthroughContext";
import { WalkthroughController } from "@/components/walkthrough/WalkthroughController";
import { allPageTours } from "@/components/walkthrough/tours";
import { PWAInstallPrompt, PWAUpdatePrompt, OfflineIndicator } from "@/components/pwa";
import { PageLoadingSpinner } from "@/components/common/PageLoadingSpinner";
import { HelpButton } from "./components/feedback/HelpButton";

// Critical path - loaded immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - grouped by access pattern
const SetPassword = lazy(() => import("./pages/SetPassword"));
const ProjectSelect = lazy(() => import("./pages/ProjectSelect"));
const Settings = lazy(() => import("./pages/Settings"));

// Dashboard layout and pages
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SiteDiary = lazy(() => import("./pages/SiteDiary"));
const ProjectSettings = lazy(() => import("./pages/ProjectSettings"));
const Messages = lazy(() => import("./pages/Messages"));

// Admin layout and pages
const AdminLayout = lazy(() => import("./pages/AdminLayout"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const BackupManagement = lazy(() => import("./pages/BackupManagement"));
const GamificationAdmin = lazy(() => import("./pages/GamificationAdmin"));
const AdminAIReview = lazy(() => import("./pages/AdminAIReview"));
const FeedbackManagement = lazy(() => import("./pages/FeedbackManagement"));
const FeedbackAnalytics = lazy(() => import("./pages/FeedbackAnalytics"));
const PRDManager = lazy(() => import("./pages/PRDManager"));
const Finance = lazy(() => import("./pages/Finance"));
const Invoicing = lazy(() => import("./pages/Invoicing"));

// Heavy feature pages - lazy loaded for bundle size
const CostReports = lazy(() => import("./pages/CostReports"));
const CostReportDetail = lazy(() => import("./pages/CostReportDetail"));
const ElectricalBudgets = lazy(() => import("./pages/ElectricalBudgets"));
const ElectricalBudgetDetail = lazy(() => import("./pages/ElectricalBudgetDetail"));
const Specifications = lazy(() => import("./pages/Specifications"));
const SpecificationDetail = lazy(() => import("./pages/SpecificationDetail"));
const CableSchedules = lazy(() => import("./pages/CableSchedules"));
const CableScheduleDetail = lazy(() => import("./pages/CableScheduleDetail"));
const FloorPlan = lazy(() => import("./pages/FloorPlan"));
const TenantTracker = lazy(() => import("./pages/TenantTracker"));
const FinalAccounts = lazy(() => import("./pages/FinalAccounts"));
const FinalAccountDetail = lazy(() => import("./pages/FinalAccountDetail"));
const BOQs = lazy(() => import("./pages/BOQs"));
const BOQDetail = lazy(() => import("./pages/BOQDetail"));
const BOQProjectDetail = lazy(() => import("./pages/BOQProjectDetail"));
const GeneratorReport = lazy(() => import("./pages/GeneratorReport"));
const LightingReport = lazy(() => import("./pages/LightingReport"));
const BulkServices = lazy(() => import("./pages/BulkServices"));
const MasterLibrary = lazy(() => import("./pages/MasterLibrary"));
const ContactLibrary = lazy(() => import("./pages/ContactLibrary"));
const DashboardContactLibrary = lazy(() => import("./pages/DashboardContactLibrary"));

// Project tools
const ProjectOutline = lazy(() => import("./pages/ProjectOutline"));
const AITools = lazy(() => import("./pages/AITools"));
const AISkills = lazy(() => import("./pages/AISkills"));
const ProjectRoadmap = lazy(() => import("./pages/ProjectRoadmap"));
const RoadmapReviewMode = lazy(() => import("./pages/RoadmapReviewMode"));
const ExternalRoadmapReview = lazy(() => import("./pages/ExternalRoadmapReview"));
const RoadmapItemRedirect = lazy(() => import("./pages/RoadmapItemRedirect"));
const DrawingRegister = lazy(() => import("./pages/DrawingRegister"));
const HandoverDocuments = lazy(() => import("./pages/HandoverDocuments"));
const Procurement = lazy(() => import("./pages/Procurement"));
const Inspections = lazy(() => import("./pages/Inspections"));

// External/client portals
const HandoverClient = lazy(() => import("./pages/HandoverClient"));
const HandoverClientManagement = lazy(() => import("./pages/HandoverClientManagement"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ClientView = lazy(() => import("./pages/ClientView"));
const ContractorReviewPortal = lazy(() => import("./pages/ContractorReviewPortal"));
const ClientGeneratorReportView = lazy(() => import("./pages/ClientGeneratorReportView"));
const ContractorPortal = lazy(() => import("./pages/ContractorPortal"));
const CableVerificationPortal = lazy(() => import("./pages/CableVerificationPortal"));

// Client subpages
const ClientTenantReport = lazy(() => import("./pages/client/ClientTenantReport"));
const ClientGeneratorReport = lazy(() => import("./pages/client/ClientGeneratorReport"));
const ClientDocumentsPage = lazy(() => import("./pages/client/ClientDocumentsPage"));

// Admin components
const EmailTemplatesAdmin = lazy(() => 
  import("./components/admin/email-templates/EmailTemplatesAdmin").then(m => ({ default: m.EmailTemplatesAdmin }))
);
const EmailTemplateEditor = lazy(() => 
  import("./components/admin/email-templates/EmailTemplateEditor").then(m => ({ default: m.EmailTemplateEditor }))
);

// Initialize React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WalkthroughProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <PWAUpdatePrompt />
            <PWAInstallPrompt />
            <HelpButton />
            <BrowserRouter>
              <WalkthroughController tours={allPageTours} />
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  {/* Public routes - critical path */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/set-password" element={<SetPassword />} />
                  
                  {/* Project selection */}
                  <Route path="/projects" element={<ProjectSelect />} />
                  <Route path="/settings" element={<Settings />} />
                  
                  {/* External client portals */}
                  <Route path="/handover-client" element={<HandoverClient />} />
                  <Route path="/handover-client-management" element={<HandoverClientManagement />} />
                  <Route path="/client-portal" element={<ClientPortal />} />
                  <Route path="/client/tenant-report/:projectId" element={<ClientTenantReport />} />
                  <Route path="/client/generator-report/:projectId" element={<ClientGeneratorReport />} />
                  <Route path="/client/documents/:projectId" element={<ClientDocumentsPage />} />
                  <Route path="/client-view" element={<ClientView />} />
                  <Route path="/generator-report/:token" element={<ClientGeneratorReportView />} />
                  <Route path="/review/:accessToken" element={<ContractorReviewPortal />} />
                  <Route path="/contractor-portal" element={<ContractorPortal />} />
                  <Route path="/cable-verification" element={<CableVerificationPortal />} />
                  
                  {/* Global pages */}
                  <Route path="/master-library" element={<MasterLibrary />} />
                  <Route path="/contact-library" element={<ContactLibrary />} />
                  <Route path="/projects/:projectId/roadmap" element={<RoadmapItemRedirect />} />
                  
                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<ProjectSelect />} />
                    <Route path="projects" element={<ProjectSelect />} />
                    <Route path="finance" element={<Finance />} />
                    <Route path="invoicing" element={<Invoicing />} />
                    <Route path="staff" element={<StaffManagement />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="backup" element={<BackupManagement />} />
                    <Route path="gamification" element={<GamificationAdmin />} />
                    <Route path="ai-review" element={<AdminAIReview />} />
                    <Route path="feedback" element={<FeedbackManagement />} />
                    <Route path="feedback-analytics" element={<FeedbackAnalytics />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="prd-manager" element={<PRDManager />} />
                    <Route path="email-templates" element={<EmailTemplatesAdmin />} />
                    <Route path="email-templates/:id" element={<EmailTemplateEditor />} />
                  </Route>
                  
                  {/* Dashboard routes */}
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="tenant-tracker" element={<TenantTracker />} />
                    <Route path="project-settings" element={<ProjectSettings />} />
                    <Route path="site-diary" element={<SiteDiary />} />
                    <Route path="ai-tools" element={<AITools />} />
                    <Route path="ai-skills" element={<AISkills />} />
                    <Route path="cost-reports" element={<CostReports />} />
                    <Route path="cost-reports/:reportId" element={<CostReportDetail />} />
                    <Route path="budgets/electrical" element={<ElectricalBudgets />} />
                    <Route path="budgets/electrical/:budgetId" element={<ElectricalBudgetDetail />} />
                    <Route path="specifications" element={<Specifications />} />
                    <Route path="specifications/:specId" element={<SpecificationDetail />} />
                    <Route path="cable-schedules" element={<CableSchedules />} />
                    <Route path="cable-schedules/:scheduleId" element={<CableScheduleDetail />} />
                    <Route path="floor-plan" element={<FloorPlan />} />
                    <Route path="final-accounts" element={<FinalAccounts />} />
                    <Route path="final-accounts/:accountId" element={<FinalAccountDetail />} />
                    <Route path="boqs" element={<BOQs />} />
                    <Route path="boqs/:boqId" element={<BOQProjectDetail />} />
                    <Route path="boq/:uploadId" element={<BOQDetail />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="project-outline" element={<ProjectOutline />} />
                    <Route path="projects-report/generator" element={<GeneratorReport />} />
                    <Route path="projects-report/lighting" element={<LightingReport />} />
                    <Route path="projects-report/handover" element={<HandoverDocuments />} />
                    <Route path="bulk-services" element={<BulkServices />} />
                    <Route path="master-library" element={<MasterLibrary />} />
                    <Route path="contact-library" element={<DashboardContactLibrary />} />
                    <Route path="roadmap" element={<ProjectRoadmap />} />
                    <Route path="roadmap-review" element={<RoadmapReviewMode />} />
                    <Route path="drawings" element={<DrawingRegister />} />
                    <Route path="procurement" element={<Procurement />} />
                    <Route path="inspections" element={<Inspections />} />
                  </Route>
                  
                  {/* External review */}
                  <Route path="/roadmap-review/:token" element={<ExternalRoadmapReview />} />
                  
                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </WalkthroughProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;