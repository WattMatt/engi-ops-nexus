import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, Search, Trash2, MoreHorizontal, Download, History } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { InvoiceHistoryImporter } from "./InvoiceHistoryImporter";
import * as XLSX from "xlsx";

export function InvoiceHistoryTab() {
  const [importerOpen, setImporterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoice-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_history")
        .select("*")
        .order("invoice_month", { ascending: false })
        .order("invoice_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    try {
      const date = parse(monthStr + "-01", "yyyy-MM-dd", new Date());
      return format(date, "MMMM yyyy");
    } catch {
      return monthStr;
    }
  };

  // Get unique months for filter
  const uniqueMonths = [...new Set(invoices.map(inv => inv.invoice_month))].sort().reverse();

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client_details?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMonth = selectedMonth === "all" || inv.invoice_month === selectedMonth;
    return matchesSearch && matchesMonth;
  });

  // Group invoices by month for display
  const invoicesByMonth = filteredInvoices.reduce((acc: Record<string, typeof invoices>, inv) => {
    const month = inv.invoice_month;
    if (!acc[month]) acc[month] = [];
    acc[month].push(inv);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoice_history")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = () => {
    const exportData = filteredInvoices.map(inv => ({
      "Invoice #": inv.invoice_number,
      "Month": formatMonth(inv.invoice_month),
      "Job Name": inv.job_name,
      "Client": inv.client_details?.split("-")[0] || "",
      "VAT Number": inv.vat_number || "",
      "Amount (Excl VAT)": inv.amount_excl_vat || "",
      "Amount (Incl VAT)": inv.amount_incl_vat || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice History");
    XLSX.writeFile(wb, `invoice_history_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Export complete");
  };

  // Calculate totals
  const totalExclVat = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);
  const totalInclVat = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_incl_vat || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice History</h3>
          <p className="text-sm text-muted-foreground">
            Historical record of all issued invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredInvoices.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setImporterOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">{filteredInvoices.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total (Excl. VAT)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalExclVat)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total (Incl. VAT)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalInclVat)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Months Covered</CardDescription>
            <CardTitle className="text-2xl">{uniqueMonths.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, job name, or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table by Month */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading invoice history...
          </CardContent>
        </Card>
      ) : Object.keys(invoicesByMonth).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoice history found.</p>
            <p className="text-sm">Import your invoice schedule from Excel to get started.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(invoicesByMonth)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthInvoices]) => {
            const monthTotal = monthInvoices.reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);
            return (
              <Card key={month}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{formatMonth(month)}</CardTitle>
                      <Badge variant="secondary">{monthInvoices.length} invoices</Badge>
                    </div>
                    <span className="font-semibold">{formatCurrency(monthTotal)}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Invoice #</TableHead>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>VAT Number</TableHead>
                        <TableHead className="text-right">Excl. VAT</TableHead>
                        <TableHead className="text-right">Incl. VAT</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {invoice.job_name}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {invoice.client_details?.split("-")[0] || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {invoice.vat_number || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount_excl_vat)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(invoice.amount_incl_vat)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(invoice.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
      )}

      <InvoiceHistoryImporter open={importerOpen} onOpenChange={setImporterOpen} />
    </div>
  );
}
