import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProjectSelect from "./pages/ProjectSelect";
import DashboardLayout from "./pages/DashboardLayout";
import SiteDiary from "./pages/SiteDiary";
import Dashboard from "./pages/Dashboard";
import FloorPlan from "./pages/FloorPlan";
import Settings from "./pages/Settings";
import ProjectSettings from "./pages/ProjectSettings";
import UserManagement from "./pages/UserManagement";
import CostReports from "./pages/CostReports";
import CostReportDetail from "./pages/CostReportDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/projects" element={<ProjectSelect />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="floor-plan" element={<FloorPlan />} />
            <Route path="site-diary" element={<SiteDiary />} />
            <Route path="cost-reports" element={<CostReports />} />
            <Route path="cost-reports/:reportId" element={<CostReportDetail />} />
            <Route path="project-settings" element={<ProjectSettings />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
