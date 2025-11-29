import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  Download,
  Eye,
  Trash2,
  FolderTree
} from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";

interface InvoiceFile {
  id: string;
  invoice_number: string;
  job_name: string;
  pdf_file_path: string;
  invoice_month: string;
  amount_excl_vat: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
}

interface MonthFolder {
  month: string;
  monthLabel: string;
  invoices: InvoiceFile[];
}

interface YearFolder {
  year: string;
  months: MonthFolder[];
  totalInvoices: number;
}

export function InvoiceFolderBrowser() {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Fetch invoices with PDF files
  const { data: invoicesWithPDFs = [], isLoading } = useQuery({
    queryKey: ["invoices-with-pdfs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_history")
        .select("id, invoice_number, job_name, pdf_file_path, invoice_month, amount_excl_vat, vat_amount, amount_incl_vat")
        .not("pdf_file_path", "is", null)
        .order("invoice_month", { ascending: false });
      if (error) throw error;
      return data as InvoiceFile[];
    },
  });

  // Organize invoices into folder structure
  const folderStructure: YearFolder[] = invoicesWithPDFs.reduce((acc: YearFolder[], invoice) => {
    const [year, month] = invoice.invoice_month.split("-");
    
    let yearFolder = acc.find(y => y.year === year);
    if (!yearFolder) {
      yearFolder = { year, months: [], totalInvoices: 0 };
      acc.push(yearFolder);
    }
    
    let monthFolder = yearFolder.months.find(m => m.month === invoice.invoice_month);
    if (!monthFolder) {
      const monthDate = parse(`${invoice.invoice_month}-01`, "yyyy-MM-dd", new Date());
      monthFolder = {
        month: invoice.invoice_month,
        monthLabel: format(monthDate, "MMMM"),
        invoices: [],
      };
      yearFolder.months.push(monthFolder);
    }
    
    monthFolder.invoices.push(invoice);
    yearFolder.totalInvoices++;
    
    return acc;
  }, []).sort((a, b) => b.year.localeCompare(a.year));

  // Sort months within each year
  folderStructure.forEach(year => {
    year.months.sort((a, b) => b.month.localeCompare(a.month));
  });

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const viewPDF = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("invoice-pdfs")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      if (data?.signedUrl) {
        // Ensure we have a full URL
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
  };

  const downloadPDF = async (filePath: string, invoiceNumber: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("invoice-pdfs")
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download started");
    } catch (error: any) {
      toast.error("Failed to download: " + error.message);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalFiles = invoicesWithPDFs.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Invoice Files</CardTitle>
              <CardDescription>Browse uploaded invoice PDFs by year and month</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalFiles} PDF{totalFiles !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading files...
          </div>
        ) : folderStructure.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mb-3 opacity-50" />
            <p>No invoice PDFs uploaded yet</p>
            <p className="text-sm">Use "Upload PDFs" to add invoices</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {folderStructure.map((yearFolder) => (
                <Collapsible
                  key={yearFolder.year}
                  open={expandedYears.has(yearFolder.year)}
                  onOpenChange={() => toggleYear(yearFolder.year)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-10 px-2 hover:bg-muted"
                    >
                      {expandedYears.has(yearFolder.year) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {expandedYears.has(yearFolder.year) ? (
                        <FolderOpen className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Folder className="h-5 w-5 text-amber-500" />
                      )}
                      <span className="font-semibold">{yearFolder.year}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {yearFolder.totalInvoices}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 pl-4 border-l border-border space-y-1">
                      {yearFolder.months.map((monthFolder) => (
                        <Collapsible
                          key={monthFolder.month}
                          open={expandedMonths.has(monthFolder.month)}
                          onOpenChange={() => toggleMonth(monthFolder.month)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-start gap-2 h-9 px-2 hover:bg-muted"
                            >
                              {expandedMonths.has(monthFolder.month) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              {expandedMonths.has(monthFolder.month) ? (
                                <FolderOpen className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Folder className="h-4 w-4 text-blue-500" />
                              )}
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{monthFolder.monthLabel}</span>
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {monthFolder.invoices.length}
                              </Badge>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 pl-4 border-l border-border space-y-0.5 py-1">
                              {monthFolder.invoices.map((invoice) => (
                                <ContextMenu key={invoice.id}>
                                  <ContextMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className={`w-full justify-start gap-1 h-auto py-1.5 px-2 hover:bg-muted text-sm ${
                                        selectedFile === invoice.id ? "bg-muted" : ""
                                      }`}
                                      onClick={() => {
                                        setSelectedFile(invoice.id);
                                        viewPDF(invoice.pdf_file_path);
                                      }}
                                    >
                                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                                      <div className="flex flex-col items-start flex-1 min-w-0">
                                        <div className="flex items-center gap-2 w-full">
                                          <span className="font-mono text-xs font-medium">{invoice.invoice_number}</span>
                                          <span className="text-muted-foreground truncate text-xs">
                                            {invoice.job_name}
                                          </span>
                                        </div>
                                        {invoice.amount_incl_vat && (
                                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className="text-green-600">{formatCurrency(invoice.amount_excl_vat)}</span>
                                            <span className="text-amber-600">+{formatCurrency(invoice.vat_amount)}</span>
                                            <span className="font-medium">={formatCurrency(invoice.amount_incl_vat)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </Button>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                    <ContextMenuItem onClick={() => viewPDF(invoice.pdf_file_path)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View PDF
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => downloadPDF(invoice.pdf_file_path, invoice.invoice_number)}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Download
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
