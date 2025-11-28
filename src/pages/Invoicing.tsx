import { BulkInvoiceImport } from "@/components/invoicing/BulkInvoiceImport";
import { MonthlySummary } from "@/components/invoicing/MonthlySummary";
import { InvoiceScheduleManager } from "@/components/invoicing/InvoiceScheduleManager";
import { CashFlowProjection } from "@/components/invoicing/CashFlowProjection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Calendar, FileText, TrendingUp } from "lucide-react";

const Invoicing = () => {
  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoicing</h1>
        <p className="text-muted-foreground">Manage projects, payment schedules and generate invoices</p>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">
            <FileText className="h-4 w-4 mr-2" />
            Payment Schedules
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            <TrendingUp className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Calendar className="h-4 w-4 mr-2" />
            Monthly Summary
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <InvoiceScheduleManager />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowProjection />
        </TabsContent>

        <TabsContent value="summary">
          <MonthlySummary />
        </TabsContent>

        <TabsContent value="import">
          <BulkInvoiceImport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Invoicing;
