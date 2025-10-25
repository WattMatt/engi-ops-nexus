import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function InvoicesList() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_projects (
            project_name,
            client_name
          )
        `)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500",
      paid: "bg-green-500",
      overdue: "bg-red-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Invoices</h3>
        <p className="text-sm text-muted-foreground">
          View and manage all generated invoices
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Claim #</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Total (incl VAT)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No invoices yet. Create a project and generate your first invoice.
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice: any) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.claim_number}</TableCell>
                <TableCell>{invoice.invoice_projects?.project_name}</TableCell>
                <TableCell>{invoice.invoice_projects?.client_name}</TableCell>
                <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                <TableCell>{formatCurrency(invoice.current_amount)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(invoice.total_amount)}</TableCell>
                <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
