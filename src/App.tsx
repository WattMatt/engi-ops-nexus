import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import ProjectSelect from "./pages/ProjectSelect";
import DashboardLayout from "./pages/DashboardLayout";
import AdminLayout from "./pages/AdminLayout";
import SiteDiary from "./pages/SiteDiary";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ProjectSettings from "./pages/ProjectSettings";
import UserManagement from "./pages/UserManagement";
import FeedbackManagement from "./pages/FeedbackManagement";
import FeedbackAnalytics from "./pages/FeedbackAnalytics";
import CostReports from "./pages/CostReports";
import CostReportDetail from "./pages/CostReportDetail";
import ElectricalBudgets from "./pages/ElectricalBudgets";
import ElectricalBudgetDetail from "./pages/ElectricalBudgetDetail";
import Specifications from "./pages/Specifications";
import SpecificationDetail from "./pages/SpecificationDetail";
import CableSchedules from "./pages/CableSchedules";
import CableScheduleDetail from "./pages/CableScheduleDetail";
import StaffManagement from "./pages/StaffManagement";
import Invoicing from "./pages/Invoicing";
import FloorPlan from "./pages/FloorPlan";
import Messages from "./pages/Messages";
import BackupManagement from "./pages/BackupManagement";
import TenantTracker from "./pages/TenantTracker";
import FinalAccounts from "./pages/FinalAccounts";
import FinalAccountDetail from "./pages/FinalAccountDetail";
import BOQDetail from "./pages/BOQDetail";
import BOQs from "./pages/BOQs";
import BOQProjectDetail from "./pages/BOQProjectDetail";
import GeneratorReport from "./pages/GeneratorReport";
import LightingReport from "./pages/LightingReport";
import ProjectOutline from "./pages/ProjectOutline";
import AITools from "./pages/AITools";
import AdminAIReview from "./pages/AdminAIReview";
import AdminRoadmapReview from "./pages/AdminRoadmapReview";
import BulkServices from "./pages/BulkServices";
import MasterLibrary from "./pages/MasterLibrary";
import ContactLibrary from "./pages/ContactLibrary";
import ProjectRoadmap from "./pages/ProjectRoadmap";
import RoadmapReviewMode from "./pages/RoadmapReviewMode";
import ExternalRoadmapReview from "./pages/ExternalRoadmapReview";
import HandoverDocuments from "./pages/HandoverDocuments";
import HandoverClient from "./pages/HandoverClient";
import HandoverClientManagement from "./pages/HandoverClientManagement";
import NotFound from "./pages/NotFound";
import Finance from "./pages/Finance";
import ClientPortal from "./pages/ClientPortal";
import ClientTenantReport from "./pages/client/ClientTenantReport";
import ClientGeneratorReport from "./pages/client/ClientGeneratorReport";
import ClientView from "./pages/ClientView";
import ContractorReviewPortal from "./pages/ContractorReviewPortal";
import PRDManager from "./pages/PRDManager";
import { EmailTemplatesAdmin } from "./components/admin/email-templates/EmailTemplatesAdmin";
import { EmailTemplateEditor } from "./components/admin/email-templates/EmailTemplateEditor";
import { HelpButton } from "./components/feedback/HelpButton";

// Initialize React Query client
const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HelpButton />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/set-password" element={<SetPassword />} />
        <Route path="/projects" element={<ProjectSelect />} />
        
        {/* Public handover route - no authentication required */}
        <Route path="/handover-client" element={<HandoverClient />} />
        
        {/* Admin handover management route */}
        <Route path="/handover-client-management" element={<HandoverClientManagement />} />
        
        {/* Client Portal routes */}
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/client/tenant-report/:projectId" element={<ClientTenantReport />} />
        <Route path="/client/generator-report/:projectId" element={<ClientGeneratorReport />} />
        
        {/* Public Client View - shareable link */}
        <Route path="/client-view" element={<ClientView />} />
        
        {/* Contractor Review Portal - public access via token */}
        <Route path="/review/:accessToken" element={<ContractorReviewPortal />} />
        
        {/* Global Master Library - accessible without selecting a project */}
        <Route path="/master-library" element={<MasterLibrary />} />
        <Route path="/contact-library" element={<ContactLibrary />} />
          
          {/* Admin routes - no project required */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<ProjectSelect />} />
            <Route path="projects" element={<ProjectSelect />} />
            <Route path="finance" element={<Finance />} />
            <Route path="invoicing" element={<Invoicing />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="backup" element={<BackupManagement />} />
            <Route path="ai-review" element={<AdminAIReview />} />
            <Route path="roadmap-review" element={<AdminRoadmapReview />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="feedback-analytics" element={<FeedbackAnalytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="prd-manager" element={<PRDManager />} />
            <Route path="email-templates" element={<EmailTemplatesAdmin />} />
            <Route path="email-templates/:id" element={<EmailTemplateEditor />} />
          </Route>

          {/* Project-specific routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="tenant-tracker" element={<TenantTracker />} />
            <Route path="project-settings" element={<ProjectSettings />} />
            <Route path="site-diary" element={<SiteDiary />} />
            <Route path="ai-tools" element={<AITools />} />
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
            <Route path="contact-library" element={<ContactLibrary />} />
            <Route path="roadmap" element={<ProjectRoadmap />} />
            <Route path="roadmap-review" element={<RoadmapReviewMode />} />
          </Route>
          {/* External review page - no auth required */}
          <Route path="/roadmap-review/:token" element={<ExternalRoadmapReview />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
