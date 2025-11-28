import { useNavigate } from "react-router-dom";
import { BulkInvoiceImport } from "@/components/invoicing/BulkInvoiceImport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Invoicing = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Import</h1>
          <p className="text-muted-foreground">Import historical invoices from Excel files</p>
        </div>
        <Button onClick={() => navigate("/admin/finance")} variant="outline">
          Go to Finance Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Looking for Cash Flow & Payment Schedules?</CardTitle>
          <CardDescription>
            Cash flow forecasting, aging reports, and payment schedule management have been consolidated into the Finance module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/admin/finance")}>
            Open Finance Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle>Bulk Invoice Import</CardTitle>
          </div>
          <CardDescription>
            Import multiple invoices from an Excel spreadsheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkInvoiceImport />
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoicing;
