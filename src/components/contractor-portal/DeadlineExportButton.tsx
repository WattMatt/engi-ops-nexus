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
 import pdfMake from "pdfmake/build/pdfmake";
 import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
 
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
       const tableBody: Content[][] = [
         [
           { text: "Shop", style: "tableHeader" },
           { text: "Tenant", style: "tableHeader" },
           { text: "DB Order", style: "tableHeader" },
           { text: "DB Status", style: "tableHeader" },
           { text: "Lighting Order", style: "tableHeader" },
           { text: "Lighting Status", style: "tableHeader" },
         ],
       ];
 
       tenants.forEach((tenant) => {
         const dbStatus = getStatus(tenant.db_last_order_date, tenant.db_ordered);
         const lightingStatus = getStatus(tenant.lighting_last_order_date, tenant.lighting_ordered);
 
         tableBody.push([
           { text: tenant.shop_number, style: "tableCell" },
           { text: tenant.shop_name || "—", style: "tableCell" },
           { text: formatDate(tenant.db_last_order_date), style: "tableCell" },
           { 
             text: dbStatus, 
             style: "tableCell",
             color: dbStatus === "Overdue" ? "#dc2626" : dbStatus === "Approaching" ? "#d97706" : "#16a34a"
           },
           { text: formatDate(tenant.lighting_last_order_date), style: "tableCell" },
           { 
             text: lightingStatus, 
             style: "tableCell",
             color: lightingStatus === "Overdue" ? "#dc2626" : lightingStatus === "Approaching" ? "#d97706" : "#16a34a"
           },
         ]);
       });
 
       const docDefinition: TDocumentDefinitions = {
         pageSize: "A4",
         pageOrientation: "landscape",
         pageMargins: [40, 60, 40, 60],
         header: {
           columns: [
             { text: `${projectName} - Deadline Report`, style: "header", margin: [40, 20, 0, 0] },
             { text: format(new Date(), "dd MMM yyyy"), alignment: "right", margin: [0, 20, 40, 0], style: "headerDate" },
           ],
         },
         footer: (currentPage: number, pageCount: number) => ({
           text: `Page ${currentPage} of ${pageCount}`,
           alignment: "center",
           margin: [0, 20, 0, 0],
           style: "footer",
         }),
         content: [
           {
             table: {
               headerRows: 1,
               widths: ["auto", "*", "auto", "auto", "auto", "auto"],
               body: tableBody,
             },
             layout: {
               hLineWidth: () => 0.5,
               vLineWidth: () => 0.5,
               hLineColor: () => "#e5e7eb",
               vLineColor: () => "#e5e7eb",
               paddingLeft: () => 8,
               paddingRight: () => 8,
               paddingTop: () => 6,
               paddingBottom: () => 6,
             },
           },
         ],
         styles: {
           header: { fontSize: 16, bold: true, color: "#1f2937" },
           headerDate: { fontSize: 10, color: "#6b7280" },
           footer: { fontSize: 9, color: "#9ca3af" },
           tableHeader: { fontSize: 10, bold: true, color: "#374151", fillColor: "#f3f4f6" },
           tableCell: { fontSize: 9, color: "#4b5563" },
         },
       };
 
       pdfMake.createPdf(docDefinition).download(`deadline-report-${projectName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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