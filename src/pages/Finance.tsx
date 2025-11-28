import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceProjectList } from "@/components/finance/FinanceProjectList";
import { InvoiceScheduleManager } from "@/components/invoicing/InvoiceScheduleManager";
import { CashFlowDashboard } from "@/components/finance/CashFlowDashboard";
import { AgingReport } from "@/components/finance/AgingReport";
import { MonthlySummary } from "@/components/invoicing/MonthlySummary";
import { FolderOpen, Calendar, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance & Cash Flow</h1>
        <p className="text-muted-foreground">
          Complete financial overview with cash flow forecasting and accounts receivable management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Aging Report
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Monthly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <CashFlowDashboard />
        </TabsContent>

        <TabsContent value="aging" className="mt-6">
          <AgingReport />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <InvoiceScheduleManager />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <FinanceProjectList />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <MonthlySummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
