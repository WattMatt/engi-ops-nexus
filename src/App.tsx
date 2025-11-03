import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import TaskManager from "./pages/TaskManager";
import NotFound from "./pages/NotFound";
import { HelpButton } from "./components/feedback/HelpButton";

const queryClient = new QueryClient();

const App = () => (
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
          
          {/* Admin routes - no project required */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<ProjectSelect />} />
            <Route path="projects" element={<ProjectSelect />} />
            <Route path="invoicing" element={<Invoicing />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="backup" element={<BackupManagement />} />
            <Route path="feedback" element={<FeedbackManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Project-specific routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<TaskManager />} />
            <Route path="tenant-tracker" element={<TenantTracker />} />
            <Route path="project-settings" element={<ProjectSettings />} />
            <Route path="site-diary" element={<SiteDiary />} />
            <Route path="cost-reports" element={<CostReports />} />
            <Route path="cost-reports/:reportId" element={<CostReportDetail />} />
            <Route path="budgets/electrical" element={<ElectricalBudgets />} />
            <Route path="budgets/electrical/:budgetId" element={<ElectricalBudgetDetail />} />
            <Route path="specifications" element={<Specifications />} />
            <Route path="specifications/:specId" element={<SpecificationDetail />} />
            <Route path="cable-schedules" element={<CableSchedules />} />
            <Route path="cable-schedules/:scheduleId" element={<CableScheduleDetail />} />
            <Route path="floor-plan" element={<FloorPlan />} />
            <Route path="messages" element={<Messages />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
