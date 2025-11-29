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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileSpreadsheet, Search, Trash2, MoreHorizontal, Download, History, Pencil, ChevronDown, ChevronRight, FolderOpen, Link2Off, Upload, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { InvoiceHistoryImporter } from "./InvoiceHistoryImporter";
import { InvoiceHistoryEditDialog } from "./InvoiceHistoryEditDialog";
import { InvoicePDFUploader } from "./InvoicePDFUploader";
import { InvoiceFolderBrowser } from "./InvoiceFolderBrowser";
import * as XLSX from "xlsx";

export function InvoiceHistoryTab() {
  const [importerOpen, setImporterOpen] = useState(false);
  const [pdfUploaderOpen, setPdfUploaderOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["unlinked"]));
  const [viewMode, setViewMode] = useState<"project" | "month">("project");
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoice-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_history")
        .select(`
          *,
          invoice_projects (
            id,
            project_name,
            client_name
          )
        `)
        .order("invoice_month", { ascending: false })
        .order("invoice_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("project_name");
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
  
  // Get unique projects for filter
  const invoiceProjectIds = [...new Set(invoices.map(inv => inv.project_id).filter(Boolean))];

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client_details?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMonth = selectedMonth === "all" || inv.invoice_month === selectedMonth;
    const matchesProject = selectedProject === "all" || 
      (selectedProject === "unlinked" && !inv.project_id) ||
      inv.project_id === selectedProject;
    return matchesSearch && matchesMonth && matchesProject;
  });

  // Group invoices by project, then by month
  const invoicesByProject = filteredInvoices.reduce((acc: Record<string, { project: any; invoicesByMonth: Record<string, any[]>; total: number }>, inv) => {
    const projectKey = inv.project_id || "unlinked";
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: inv.invoice_projects || null,
        invoicesByMonth: {},
        total: 0,
      };
    }
    const month = inv.invoice_month;
    if (!acc[projectKey].invoicesByMonth[month]) {
      acc[projectKey].invoicesByMonth[month] = [];
    }
    acc[projectKey].invoicesByMonth[month].push(inv);
    acc[projectKey].total += inv.amount_excl_vat || 0;
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
      "Date": inv.invoice_date || "",
      "Month": formatMonth(inv.invoice_month),
      "Project": inv.invoice_projects?.project_name || "Unlinked",
      "Job Name": inv.job_name,
      "Client": inv.client_details?.split("-")[0] || "",
      "VAT Number": inv.vat_number || "",
      "Net Amount (Excl VAT)": inv.amount_excl_vat || 0,
      "VAT Amount (15%)": inv.vat_amount || 0,
      "Gross Amount (Incl VAT)": inv.amount_incl_vat || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice History");
    XLSX.writeFile(wb, `invoice_history_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Export complete");
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Calculate totals with VAT breakdown
  const totalExclVat = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);
  const totalVat = filteredInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);
  const totalInclVat = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_incl_vat || 0), 0);
  const linkedCount = filteredInvoices.filter(inv => inv.project_id).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice History</h3>
          <p className="text-sm text-muted-foreground">
            Historical record of issued invoices grouped by project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredInvoices.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setImporterOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          <Button onClick={() => setPdfUploaderOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Upload PDFs
          </Button>
        </div>
      </div>

      {/* Summary Cards - Financial Accounting View */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-xl">{filteredInvoices.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Linked</CardDescription>
            <CardTitle className="text-xl">{linkedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Net Income (Excl. VAT)</CardDescription>
            <CardTitle className="text-xl text-green-600">{formatCurrency(totalExclVat)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-amber-500/5 border-amber-200">
          <CardHeader className="pb-2">
            <CardDescription>VAT Collected (15%)</CardDescription>
            <CardTitle className="text-xl text-amber-600">{formatCurrency(totalVat)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Gross Total (Incl. VAT)</CardDescription>
            <CardTitle className="text-xl text-primary">{formatCurrency(totalInclVat)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projects</CardDescription>
            <CardTitle className="text-xl">{Object.keys(invoicesByProject).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Grid - Folder Browser + Invoice List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Browser - Left Side */}
        <div className="lg:col-span-1">
          <InvoiceFolderBrowser />
        </div>

        {/* Invoice List - Right Side */}
        <div className="lg:col-span-3 space-y-4">
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
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="unlinked">Unlinked Invoices</SelectItem>
                {projects.filter(p => invoiceProjectIds.includes(p.id)).map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
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

      {/* Invoice Groups by Project */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading invoice history...
          </CardContent>
        </Card>
      ) : Object.keys(invoicesByProject).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoice history found.</p>
            <p className="text-sm">Import your invoice schedule from Excel to get started.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(invoicesByProject)
          .sort(([a], [b]) => {
            if (a === "unlinked") return 1;
            if (b === "unlinked") return -1;
            return (invoicesByProject[b].total) - (invoicesByProject[a].total);
          })
          .map(([projectKey, data]) => {
            const isExpanded = expandedProjects.has(projectKey);
            const monthCount = Object.keys(data.invoicesByMonth).length;
            const invoiceCount = Object.values(data.invoicesByMonth).flat().length;
            
            return (
              <Collapsible key={projectKey} open={isExpanded} onOpenChange={() => toggleProject(projectKey)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          {projectKey === "unlinked" ? (
                            <>
                              <Link2Off className="h-5 w-5 text-muted-foreground" />
                              <CardTitle className="text-lg">Unlinked Invoices</CardTitle>
                            </>
                          ) : (
                            <>
                              <FolderOpen className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-lg">{data.project?.project_name}</CardTitle>
                                <CardDescription>{data.project?.client_name}</CardDescription>
                              </div>
                            </>
                          )}
                          <Badge variant="secondary">{invoiceCount} invoices</Badge>
                          <Badge variant="outline">{monthCount} months</Badge>
                        </div>
                        <span className="font-semibold text-lg">{formatCurrency(data.total)}</span>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {Object.entries(data.invoicesByMonth)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([month, monthInvoices]) => {
                          const monthTotal = monthInvoices.reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);
                          return (
                            <div key={month} className="border rounded-lg">
                              <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatMonth(month)}</span>
                                  <Badge variant="secondary" className="text-xs">{monthInvoices.length}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-green-600">Net: {formatCurrency(monthTotal)}</span>
                                  <span className="text-amber-600">VAT: {formatCurrency(monthInvoices.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0))}</span>
                                  <span className="font-semibold">Total: {formatCurrency(monthInvoices.reduce((sum, inv) => sum + (inv.amount_incl_vat || 0), 0))}</span>
                                </div>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[100px]">Invoice #</TableHead>
                                    <TableHead>Job Name</TableHead>
                                    <TableHead className="text-right">Net (Excl.)</TableHead>
                                    <TableHead className="text-right text-amber-600">VAT 15%</TableHead>
                                    <TableHead className="text-right">Gross (Incl.)</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {monthInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                      <TableCell className="font-mono font-medium">
                                        <div className="flex items-center gap-2">
                                          {invoice.invoice_number}
                                          {invoice.pdf_file_path && (
                                            <span title="PDF attached">
                                              <FileText className="h-3 w-3 text-muted-foreground" />
                                            </span>
                                          )}
                                          {invoice.extracted_by_ai && (
                                            <span title="AI extracted">
                                              <Sparkles className="h-3 w-3 text-primary" />
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="max-w-[200px] truncate" title={invoice.job_name}>
                                        {invoice.job_name}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-green-600">
                                        {formatCurrency(invoice.amount_excl_vat)}
                                      </TableCell>
                                      <TableCell className="text-right text-amber-600">
                                        {formatCurrency(invoice.vat_amount)}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
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
                                            {invoice.pdf_file_path && (
                                              <>
                                                <DropdownMenuItem
                                                  onClick={async () => {
                                                    try {
                                                      const { data, error } = await supabase.storage
                                                        .from("invoice-pdfs")
                                                        .createSignedUrl(invoice.pdf_file_path, 3600);
                                                      if (error) throw error;
                                                      if (data?.signedUrl) {
                                                        const fullUrl = data.signedUrl.startsWith('http') 
                                                          ? data.signedUrl 
                                                          : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${data.signedUrl}`;
                                                        window.open(fullUrl, "_blank");
                                                      } else {
                                                        toast.error("Could not generate PDF URL");
                                                      }
                                                    } catch (error: any) {
                                                      console.error("PDF view error:", error);
                                                      toast.error("Failed to open PDF: " + error.message);
                                                    }
                                                  }}
                                                >
                                                  <FileText className="mr-2 h-4 w-4" />
                                                  View PDF
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                              </>
                                            )}
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setEditingInvoice(invoice);
                                                setEditDialogOpen(true);
                                              }}
                                            >
                                              <Pencil className="mr-2 h-4 w-4" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
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
                            </div>
                          );
                        })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
      )}
        </div>
      </div>

      <InvoiceHistoryImporter open={importerOpen} onOpenChange={setImporterOpen} />
      <InvoicePDFUploader open={pdfUploaderOpen} onOpenChange={setPdfUploaderOpen} />
      <InvoiceHistoryEditDialog 
        invoice={editingInvoice} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </div>
  );
}
