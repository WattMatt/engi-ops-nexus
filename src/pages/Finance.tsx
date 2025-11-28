import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceProjectList } from "@/components/finance/FinanceProjectList";
import { InvoiceScheduleManager } from "@/components/invoicing/InvoiceScheduleManager";
import { CashFlowProjection } from "@/components/invoicing/CashFlowProjection";
import { FolderOpen, Calendar, TrendingUp, FileText } from "lucide-react";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance</h1>
        <p className="text-muted-foreground">
          Manage finance projects, documents, payment schedules and invoices
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payment Schedules
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <FinanceProjectList />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <InvoiceScheduleManager />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <CashFlowProjection />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Invoices</CardTitle>
              <CardDescription>
                View and manage invoices generated from payment schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Invoices will be generated from payment schedules. Select a scheduled payment and click "Generate Invoice".
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
