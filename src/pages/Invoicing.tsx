import { BulkInvoiceImport } from "@/components/invoicing/BulkInvoiceImport";
import { MonthlySummary } from "@/components/invoicing/MonthlySummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Calendar } from "lucide-react";

const Invoicing = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoicing</h1>
        <p className="text-muted-foreground">Manage projects and generate invoices</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">
            <Calendar className="h-4 w-4 mr-2" />
            Monthly Summary
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import Invoices
          </TabsTrigger>
        </TabsList>

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
