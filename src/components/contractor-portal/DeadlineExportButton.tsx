 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Download, FileSpreadsheet, FileText } from "lucide-react";
 import { toast } from "sonner";
 import { format, parseISO } from "date-fns";
 import { arrayToCSV, downloadCSV, generateFilename } from "@/lib/csvExport";
 import { buildDeadlineReportPdf } from "@/utils/svg-pdf/deadlineReportPdfBuilder";
 import { svgPagesToDownload } from "@/utils/svg-pdf/svgToPdfEngine";
 
 interface Tenant {
   id: string;
   shop_number: string;
   shop_name: string | null;
   opening_date: string | null;
   beneficial_occupation_days: number | null;
   db_last_order_date: string | null;
   db_delivery_date: string | null;
   lighting_last_order_date: string | null;
   lighting_delivery_date: string | null;
   db_ordered: boolean | null;
   lighting_ordered: boolean | null;
 }
 
 interface DeadlineExportButtonProps {
   tenants: Tenant[];
   projectName?: string;
 }
 
 export function DeadlineExportButton({ tenants, projectName = "Project" }: DeadlineExportButtonProps) {
   const [isExporting, setIsExporting] = useState(false);
 
   const formatDate = (dateStr: string | null): string => {
     if (!dateStr) return "—";
     try {
       return format(parseISO(dateStr), "dd MMM yyyy");
     } catch {
       return "—";
     }
   };
 
   const getStatus = (dateStr: string | null, ordered: boolean | null): string => {
     if (ordered) return "Ordered";
     if (!dateStr) return "No deadline";
     const date = parseISO(dateStr);
     const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
     if (daysUntil < 0) return "Overdue";
     if (daysUntil <= 14) return "Approaching";
     return "On Track";
   };
 
   const handleExportExcel = () => {
     const headers = [
       "Shop No",
       "Tenant Name",
       "DB Order Deadline",
       "DB Delivery Date",
       "DB Status",
       "Lighting Order Deadline",
       "Lighting Delivery Date",
       "Lighting Status",
     ];
 
     const rows = tenants.map((tenant) => [
       tenant.shop_number,
       tenant.shop_name || "—",
       formatDate(tenant.db_last_order_date),
       formatDate(tenant.db_delivery_date),
       getStatus(tenant.db_last_order_date, tenant.db_ordered),
       formatDate(tenant.lighting_last_order_date),
       formatDate(tenant.lighting_delivery_date),
       getStatus(tenant.lighting_last_order_date, tenant.lighting_ordered),
     ]);
 
     const csv = arrayToCSV(headers, rows);
     const filename = generateFilename(`deadline-report-${projectName.toLowerCase().replace(/\s+/g, '-')}`);
     downloadCSV(csv, filename);
     toast.success("Deadline report exported to Excel/CSV");
   };
 
   const handleExportPDF = async () => {
     setIsExporting(true);
     try {
       const pdfTenants = tenants.map((tenant) => ({
         shopNumber: tenant.shop_number,
         tenantName: tenant.shop_name || "—",
         dbOrderDeadline: formatDate(tenant.db_last_order_date),
         dbStatus: getStatus(tenant.db_last_order_date, tenant.db_ordered),
         lightingOrderDeadline: formatDate(tenant.lighting_last_order_date),
         lightingStatus: getStatus(tenant.lighting_last_order_date, tenant.lighting_ordered),
       }));
 
       const svgPages = buildDeadlineReportPdf({
         coverData: {
           reportTitle: 'Deadline Report',
           projectName,
           date: format(new Date(), 'dd MMMM yyyy'),
         },
         projectName,
         tenants: pdfTenants,
       });
 
       await svgPagesToDownload(svgPages, {
         filename: `deadline-report-${projectName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
       });
 
       toast.success("Deadline report exported to PDF");
     } catch (error) {
       console.error("PDF export error:", error);
       toast.error("Failed to export PDF");
     } finally {
       setIsExporting(false);
     }
   };
 
   return (
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
         <Button variant="outline" size="sm" disabled={isExporting || tenants.length === 0}>
           <Download className="h-4 w-4 mr-2" />
           Export
         </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end">
         <DropdownMenuItem onClick={handleExportExcel}>
           <FileSpreadsheet className="h-4 w-4 mr-2" />
           Export to Excel (CSV)
         </DropdownMenuItem>
         <DropdownMenuItem onClick={handleExportPDF}>
           <FileText className="h-4 w-4 mr-2" />
           Export to PDF
         </DropdownMenuItem>
       </DropdownMenuContent>
     </DropdownMenu>
   );
 }