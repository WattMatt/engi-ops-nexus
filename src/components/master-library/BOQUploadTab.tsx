import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Clock, CheckCircle, XCircle, Eye, Loader2, Building2, MapPin, Calendar, Trash2, RefreshCw, MoreHorizontal, Download, Sheet, ExternalLink, RefreshCcw, FileText, Presentation, Mail, FolderPlus, ClipboardList, FileQuestion, ClipboardCheck, HardHat, Sparkles, FileInput, FilePlus2, Database, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BOQReviewDialog } from "./BOQReviewDialog";
import { BOQPreviewDialog } from "./BOQPreviewDialog";
import { BOQProcessingWizard } from "../boq/BOQProcessingWizard";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { parseExcelFile } from "@/utils/excelParser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
const SA_PROVINCES = [
  "Western Cape",
  "Eastern Cape", 
  "Northern Cape",
  "KwaZulu-Natal",
  "Gauteng",
  "Mpumalanga",
  "Limpopo",
  "North West",
  "Free State",
];

const BUILDING_TYPES = [
  "Retail",
  "Commercial",
  "Industrial",
  "Residential",
  "Healthcare",
  "Education",
  "Mixed Use",
  "Hospitality",
  "Warehouse",
  "Data Centre",
];

interface BOQUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  status: string;
  total_items_extracted: number;
  items_matched_to_master: number;
  source_description: string | null;
  contractor_name: string | null;
  project_id: string | null;
  province: string | null;
  building_type: string | null;
  tender_date: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string | null;
}

export const BOQUploadTab = () => {
  const navigate = useNavigate();
  const [selectedUpload, setSelectedUpload] = useState<BOQUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sourceDescription, setSourceDescription] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedBuildingType, setSelectedBuildingType] = useState<string>("");
  const [tenderDate, setTenderDate] = useState<Date | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<BOQUpload | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardUpload, setWizardUpload] = useState<BOQUpload | null>(null);
  const queryClient = useQueryClient();

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_number")
        .order("name");
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: uploads, isLoading } = useQuery({
    queryKey: ["boq-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_uploads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BOQUpload[];
    },
    // Poll every 5 seconds if any uploads are processing
    refetchInterval: (query) => {
      const data = query.state.data as BOQUpload[] | undefined;
      const hasProcessing = data?.some(u => u.status === "processing");
      return hasProcessing ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine file type
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv", "pdf"].includes(fileExt || "")) {
        throw new Error("Unsupported file type. Please upload Excel, CSV, or PDF.");
      }

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("boq-uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create upload record with all metadata (status = pending, NOT processing yet)
      const { data: uploadRecord, error: recordError } = await supabase
        .from("boq_uploads")
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          source_description: sourceDescription || null,
          contractor_name: contractorName || null,
          project_id: selectedProjectId || null,
          province: selectedProvince || null,
          building_type: selectedBuildingType || null,
          tender_date: tenderDate?.toISOString().split('T')[0] || null,
          uploaded_by: user.id,
          status: "pending", // File uploaded but not yet processed
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // File is stored - extraction will happen when user clicks "Process"
      return uploadRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success("BOQ uploaded. Click 'Process' to extract rates with AI.");
      // Reset form
      setSourceDescription("");
      setContractorName("");
      setSelectedProjectId("");
      setSelectedProvince("");
      setSelectedBuildingType("");
      setTenderDate(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload BOQ");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  // Delete upload mutation
  const deleteMutation = useMutation({
    mutationFn: async (upload: BOQUpload) => {
      // Delete extracted items first
      const { error: itemsError } = await supabase
        .from("boq_extracted_items")
        .delete()
        .eq("upload_id", upload.id);
      
      if (itemsError) {
        console.error("Error deleting items:", itemsError);
      }

      // Delete file from storage
      if (upload.file_path) {
        const { error: storageError } = await supabase.storage
          .from("boq-uploads")
          .remove([upload.file_path]);
        
        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }

      // Delete upload record
      const { error: uploadError } = await supabase
        .from("boq_uploads")
        .delete()
        .eq("id", upload.id);

      if (uploadError) throw uploadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success("BOQ upload deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete upload");
    },
  });

  // Open preview dialog for an upload
  const handleOpenPreview = async (upload: BOQUpload) => {
    if (!upload.file_path) {
      toast.error("No file available for preview");
      return;
    }

    // Check if this is a Google Sheets import (no actual file in storage)
    if (upload.file_path.startsWith("google_sheets/")) {
      toast.error("Google Sheets imports cannot be previewed. Use 'Re-process' to extract items directly from the linked sheet.");
      return;
    }

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(upload.file_path);

      if (downloadError) throw new Error("Failed to download file: " + downloadError.message);

      // Create File object from blob
      const file = new File([fileData], upload.file_name, { type: fileData.type });
      
      setPreviewUpload(upload);
      setPreviewFile(file);
      setPreviewOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load file for preview");
    }
  };

  // Process with selected content from preview
  const processWithSelectedContent = async (selectedContent: string, selectedSheets: string[]) => {
    if (!previewUpload) return;

    setPreviewOpen(false);
    
    try {
      // Update status to processing
      await supabase
        .from("boq_uploads")
        .update({ status: "processing", extraction_started_at: new Date().toISOString() })
        .eq("id", previewUpload.id);

      // Delete existing extracted items
      await supabase
        .from("boq_extracted_items")
        .delete()
        .eq("upload_id", previewUpload.id);

      toast.success(`Processing ${selectedSheets.length} sheet(s)...`);

      // Call the new matching edge function
      try {
        await supabase.functions.invoke(
          "match-boq-rates",
          {
            body: {
              upload_id: previewUpload.id,
              file_content: selectedContent,
            },
          }
        );
      } catch (invokeError) {
        console.log("Edge function invoke returned (processing in background):", invokeError);
      }

      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success("BOQ processing started. This may take a few minutes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start processing");
    }

    setPreviewUpload(null);
    setPreviewFile(null);
  };

  // Re-process upload mutation (direct processing without preview)
  const reprocessMutation = useMutation({
    mutationFn: async (upload: BOQUpload) => {
      if (!upload.file_path) {
        throw new Error("No file available for re-processing");
      }

      // Update status to processing
      await supabase
        .from("boq_uploads")
        .update({ status: "processing", extraction_started_at: new Date().toISOString() })
        .eq("id", upload.id);

      // Delete existing extracted items
      await supabase
        .from("boq_extracted_items")
        .delete()
        .eq("upload_id", upload.id);

      // Check if this is a Google Sheets import
      if (upload.file_path.startsWith("google_sheets/")) {
        const spreadsheetId = upload.file_path.replace("google_sheets/", "");
        toast.info("Fetching data from Google Sheets...");
        
        // Call the new matching edge function for Google Sheets
        try {
          await supabase.functions.invoke(
            "match-boq-rates",
            {
              body: {
                upload_id: upload.id,
                google_sheet_id: spreadsheetId,
              },
            }
          );
        } catch (invokeError) {
          console.log("Edge function invoke returned (may be processing in background):", invokeError);
        }

        return upload;
      }

      // Download file from storage (for regular file uploads)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(upload.file_path);

      if (downloadError) throw new Error("Failed to download file: " + downloadError.message);

      // Parse the file
      let fileContent = "";
      const fileExt = upload.file_type;

      if (fileExt === "csv") {
        fileContent = await fileData.text();
      } else if (fileExt === "xlsx" || fileExt === "xls") {
        toast.info("Re-parsing Excel file...");
        const file = new File([fileData], upload.file_name, { type: fileData.type });
        const parsed = await parseExcelFile(file);
        fileContent = parsed.combinedText;
        toast.info(`Found ${parsed.sheets.length} sheet(s) with ${parsed.totalRows} rows`);
      }

      // Call the new matching edge function
      try {
        await supabase.functions.invoke(
          "match-boq-rates",
          {
            body: {
              upload_id: upload.id,
              file_content: fileContent,
            },
          }
        );
      } catch (invokeError) {
        // Edge function may timeout on client side but still complete in background
        console.log("Edge function invoke returned (may be processing in background):", invokeError);
      }

      return upload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success("BOQ processing started. This may take a few minutes for large files.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start BOQ processing");
    },
  });

  // Export to Google Sheets
  const handleExportToSheets = async (upload: BOQUpload) => {
    if (upload.status !== "completed" && upload.status !== "reviewed") {
      toast.error("Can only export completed BOQs to Google Sheets");
      return;
    }

    setExportingId(upload.id);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "export",
          upload_id: upload.id,
          title: `BOQ - ${upload.file_name}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Export failed");

      toast.success(`Exported ${data.itemCount} items to Google Sheets`, {
        action: {
          label: "Open Sheet",
          onClick: () => window.open(data.spreadsheetUrl, "_blank"),
        },
      });

      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export to Google Sheets");
    } finally {
      setExportingId(null);
    }
  };

  // Sync from Google Sheet
  const handleSyncFromSheet = async (upload: BOQUpload) => {
    // Extract spreadsheet ID from source_description
    const match = upload.source_description?.match(/\[Google Sheet: https:\/\/docs\.google\.com\/spreadsheets\/d\/([^\/]+)/);
    if (!match) {
      toast.error("No linked Google Sheet found. Export first.");
      return;
    }

    const spreadsheetId = match[1];
    setSyncingId(upload.id);

    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "sync_from_sheet",
          upload_id: upload.id,
          spreadsheet_id: spreadsheetId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Sync failed");

      toast.success(`Synced ${data.updatedCount} items from Google Sheet`);
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["boq-extracted-items"] });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync from Google Sheet");
    } finally {
      setSyncingId(null);
    }
  };

  // Check if upload has a linked Google Sheet
  const getLinkedSheetUrl = (upload: BOQUpload): string | null => {
    const match = upload.source_description?.match(/\[Google Sheet: (https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\]]+)\]/);
    return match ? match[1] : null;
  };

  // Create Google Doc report
  const handleCreateDocReport = async (upload: BOQUpload) => {
    if (upload.status !== "completed" && upload.status !== "reviewed") {
      toast.error("Can only create reports for completed BOQs");
      return;
    }

    const toastId = toast.loading("Creating Google Doc report...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_boq_report",
          upload_id: upload.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create report");

      toast.success(`Created BOQ report with ${data.itemCount} items`, {
        id: toastId,
        action: {
          label: "Open Doc",
          onClick: () => window.open(data.documentUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create report", { id: toastId });
    }
  };

  // Create Google Slides presentation
  const handleCreatePresentation = async (upload: BOQUpload) => {
    if (upload.status !== "completed" && upload.status !== "reviewed") {
      toast.error("Can only create presentations for completed BOQs");
      return;
    }

    const toastId = toast.loading("Creating presentation...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_boq_presentation",
          upload_id: upload.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create presentation");

      toast.success("Created BOQ presentation", {
        id: toastId,
        action: {
          label: "Open Slides",
          onClick: () => window.open(data.presentationUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create presentation", { id: toastId });
    }
  };

  // Share BOQ via email with enhanced options
  const handleShareViaEmail = async (upload: BOQUpload) => {
    const email = prompt("Enter email address to share with:");
    if (!email) return;

    const includeSheet = confirm("Include/create Google Sheet link?");
    const includeDoc = confirm("Include/create Google Doc report?");

    const toastId = toast.loading("Preparing and sending email...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "share_boq_via_email",
          upload_id: upload.id,
          to: email,
          include_sheet: includeSheet,
          include_doc: includeDoc,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to send email");

      let successMsg = `BOQ shared with ${email}`;
      if (data.sheetUrl || data.docUrl) {
        successMsg += ` (included: ${data.sheetUrl ? 'Sheet' : ''}${data.sheetUrl && data.docUrl ? ', ' : ''}${data.docUrl ? 'Doc' : ''})`;
      }
      toast.success(successMsg, { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email", { id: toastId });
    }
  };

  // Create Drive folder for project
  const handleCreateDriveFolder = async (upload: BOQUpload) => {
    const folderName = prompt("Enter folder name:", `BOQ - ${upload.file_name.replace(/\.[^/.]+$/, '')}`);
    if (!folderName) return;

    const toastId = toast.loading("Creating Drive folder...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_project_folder",
          project_name: folderName,
          upload_id: upload.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create folder");

      toast.success("Created Drive folder", {
        id: toastId,
        action: {
          label: "Open Folder",
          onClick: () => window.open(data.folderUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create folder", { id: toastId });
    }
  };

  // Create BOQ Review Form
  const handleCreateReviewForm = async (upload: BOQUpload) => {
    if (upload.status !== "completed" && upload.status !== "reviewed") {
      toast.error("Can only create review forms for completed BOQs");
      return;
    }

    const toastId = toast.loading("Creating review form...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_boq_review_form",
          upload_id: upload.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create form");

      toast.success("Created BOQ review form", {
        id: toastId,
        action: {
          label: "Open Form",
          onClick: () => window.open(data.responderUri, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create form", { id: toastId });
    }
  };

  // Create Feedback Form
  const handleCreateFeedbackForm = async (upload: BOQUpload) => {
    const projectName = upload.contractor_name || upload.file_name.replace(/\.[^/.]+$/, '');
    const toastId = toast.loading("Creating feedback form...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_feedback_form",
          project_name: projectName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create form");

      toast.success("Created feedback form", {
        id: toastId,
        action: {
          label: "Open Form",
          onClick: () => window.open(data.responderUri, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create form", { id: toastId });
    }
  };

  // Create Site Inspection Form
  const handleCreateInspectionForm = async (upload: BOQUpload) => {
    const projectName = upload.contractor_name || upload.file_name.replace(/\.[^/.]+$/, '');
    const toastId = toast.loading("Creating inspection form...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_site_inspection_form",
          project_name: projectName,
          inspection_type: "Progress Inspection",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create form");

      toast.success("Created site inspection form", {
        id: toastId,
        action: {
          label: "Open Form",
          onClick: () => window.open(data.responderUri, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create form", { id: toastId });
    }
  };

  // Create Variation Request Form
  const handleCreateVariationForm = async (upload: BOQUpload) => {
    const projectName = upload.contractor_name || upload.file_name.replace(/\.[^/.]+$/, '');
    const toastId = toast.loading("Creating variation request form...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_variation_request_form",
          project_name: projectName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create form");

      toast.success("Created variation request form", {
        id: toastId,
        action: {
          label: "Open Form",
          onClick: () => window.open(data.responderUri, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create form", { id: toastId });
    }
  };

  // Download original file
  const handleDownloadFile = async (upload: BOQUpload) => {
    if (!upload.file_path) {
      toast.error("No file available for download");
      return;
    }

    const { data, error } = await supabase.storage
      .from("boq-uploads")
      .download(upload.file_path);

    if (error) {
      toast.error("Failed to download file");
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = upload.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export with Auto-Rates (matches items to master library)
  const handleExportWithAutoRates = async (upload: BOQUpload) => {
    if (upload.status !== "completed" && upload.status !== "reviewed") {
      toast.error("Can only export completed BOQs");
      return;
    }

    const toastId = toast.loading("Exporting with auto-rate matching...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "export_with_auto_rates",
          upload_id: upload.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Export failed");

      toast.success(`Exported ${data.itemCount} items (${data.matchedCount} matched to master rates - ${data.matchRate}%)`, {
        id: toastId,
        action: {
          label: "Open Sheet",
          onClick: () => window.open(data.spreadsheetUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export", { id: toastId });
    }
  };

  // Import BOQ from Google Sheet
  const handleImportFromSheet = async () => {
    const spreadsheetUrl = prompt("Enter Google Sheet URL or ID:");
    if (!spreadsheetUrl) return;

    // Extract spreadsheet ID from URL or use as-is
    const idMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = idMatch ? idMatch[1] : spreadsheetUrl;

    const toastId = toast.loading("Importing from Google Sheet...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "import_from_sheet",
          spreadsheet_id: spreadsheetId,
          province: selectedProvince || null,
          building_type: selectedBuildingType || null,
          contractor_name: contractorName || null,
          project_id: selectedProjectId || null,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Import failed");

      toast.success(`Imported ${data.itemCount} items from "${data.spreadsheetTitle}"`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import", { id: toastId });
    }
  };

  // Create BOQ Template with rate formulas
  const handleCreateBOQTemplate = async () => {
    const templateName = prompt("Enter template name:", "BOQ Template");
    if (!templateName) return;

    const includeMasterRates = confirm("Include Master Rates sheet with VLOOKUP formulas?");

    const toastId = toast.loading("Creating BOQ template...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_boq_template",
          template_name: templateName,
          include_master_rates: includeMasterRates,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create template");

      toast.success(`Created template with ${data.sections.length} sections${data.hasMasterRates ? ' + auto-rate lookup' : ''}`, {
        id: toastId,
        action: {
          label: "Open Template",
          onClick: () => window.open(data.spreadsheetUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create template", { id: toastId });
    }
  };

  // Create Master Rates Sheet
  const handleCreateMasterRatesSheet = async () => {
    const toastId = toast.loading("Creating Master Rates sheet...");
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-sync", {
        body: {
          action: "create_master_rates_sheet",
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to create sheet");

      toast.success(`Created Master Rates sheet with ${data.materialCount} materials`, {
        id: toastId,
        action: {
          label: "Open Sheet",
          onClick: () => window.open(data.spreadsheetUrl, "_blank"),
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sheet", { id: toastId });
    }
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        uploadMutation.mutate(file);
      }
      event.target.value = "";
    },
    [uploadMutation]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "reviewed":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Dialog */}
      <BOQProcessingWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
          queryClient.invalidateQueries({ queryKey: ["master-materials"] });
        }}
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload BOQ Document
              </CardTitle>
              <CardDescription>
                Upload Excel, CSV, or PDF files to extract material rates using AI
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setWizardOpen(true)} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Process BOQ Wizard
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportFromSheet}>
                <FileInput className="h-4 w-4 mr-2" />
                Import from Sheet
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateBOQTemplate}>
                <FilePlus2 className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button variant="outline" size="sm" onClick={handleCreateMasterRatesSheet}>
                <Database className="h-4 w-4 mr-2" />
                Master Rates Sheet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project & Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Project
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number ? `${project.project_number} - ` : ""}{project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Province
              </Label>
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {SA_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Building Type</Label>
              <Select value={selectedBuildingType} onValueChange={setSelectedBuildingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUILDING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Tender Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tenderDate && "text-muted-foreground"
                    )}
                  >
                    {tenderDate ? format(tenderDate, "dd MMM yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={tenderDate}
                    onSelect={setTenderDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Source & Contractor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Description (Optional)</Label>
              <Input
                placeholder="e.g. Tender from ABC Contractors - Project X"
                value={sourceDescription}
                onChange={(e) => setSourceDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contractor Name (Optional)</Label>
              <Input
                placeholder="e.g. ABC Electrical Contractors"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Drag and drop your BOQ file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: Excel (.xlsx, .xls), CSV, PDF
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              id="boq-file-input"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button asChild disabled={uploading}>
              <label htmlFor="boq-file-input" className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </>
                )}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            Previously uploaded BOQ documents and their extraction status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : uploads?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No BOQ uploads yet. Upload your first BOQ to get started.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Project / Source</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads?.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[180px]">
                            {upload.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="truncate">
                          {upload.source_description?.replace(/\n?\[Google Sheet:.*\]/, '') || upload.contractor_name || "—"}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {upload.building_type && (
                            <Badge variant="outline" className="text-xs">
                              {upload.building_type}
                            </Badge>
                          )}
                          {getLinkedSheetUrl(upload) && (
                            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => window.open(getLinkedSheetUrl(upload)!, "_blank")}>
                              <Sheet className="h-3 w-3 mr-1" />
                              Sheet
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {upload.province ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {upload.province}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(upload.status)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{upload.total_items_extracted}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(upload.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {upload.status === "pending" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setWizardUpload(upload);
                                setWizardOpen(true);
                              }}
                            >
                              <Wand2 className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUpload(upload)}
                              disabled={upload.status === "processing"}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownloadFile(upload)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download Original
                              </DropdownMenuItem>
                              {/* Re-extract for completed/reviewed BOQs */}
                              {(upload.status === "completed" || upload.status === "reviewed") && (
                                <DropdownMenuItem 
                                  onClick={() => reprocessMutation.mutate(upload)}
                                  disabled={reprocessMutation.isPending}
                                  className="text-orange-600 dark:text-orange-400"
                                >
                                  <RefreshCw className={cn("h-4 w-4 mr-2", reprocessMutation.isPending && "animate-spin")} />
                                  Re-extract (Reset & Process Again)
                                </DropdownMenuItem>
                              )}
                              {/* Re-process for pending/failed */}
                              {(upload.status === "pending" || upload.status === "failed") && (
                                <DropdownMenuItem 
                                  onClick={() => reprocessMutation.mutate(upload)}
                                  disabled={reprocessMutation.isPending}
                                >
                                  <RefreshCw className={cn("h-4 w-4 mr-2", reprocessMutation.isPending && "animate-spin")} />
                                  Process Now
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {/* Spreadsheet View */}
                              {(upload.status === "completed" || upload.status === "reviewed") && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/dashboard/boq/${upload.id}`)}
                                  >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    View in Spreadsheet
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {/* Google Sheets Options */}
                              {(upload.status === "completed" || upload.status === "reviewed") && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleExportToSheets(upload)}
                                    disabled={exportingId === upload.id}
                                  >
                                    <Sheet className={cn("h-4 w-4 mr-2", exportingId === upload.id && "animate-pulse")} />
                                    {exportingId === upload.id ? "Exporting..." : "Export to Google Sheets"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleExportWithAutoRates(upload)}
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Export with Auto-Rates
                                  </DropdownMenuItem>
                                  {getLinkedSheetUrl(upload) && (
                                    <>
                                      <DropdownMenuItem 
                                        onClick={() => window.open(getLinkedSheetUrl(upload)!, "_blank")}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Google Sheet
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleSyncFromSheet(upload)}
                                        disabled={syncingId === upload.id}
                                      >
                                        <RefreshCcw className={cn("h-4 w-4 mr-2", syncingId === upload.id && "animate-spin")} />
                                        {syncingId === upload.id ? "Syncing..." : "Sync from Sheet"}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  {/* Google Docs & Slides */}
                                  <DropdownMenuItem onClick={() => handleCreateDocReport(upload)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Create Google Doc Report
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreatePresentation(upload)}>
                                    <Presentation className="h-4 w-4 mr-2" />
                                    Create Slides Presentation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {/* Share via Email */}
                                  <DropdownMenuItem onClick={() => handleShareViaEmail(upload)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Share via Email
                                  </DropdownMenuItem>
                                  {/* Drive Folder */}
                                  <DropdownMenuItem onClick={() => handleCreateDriveFolder(upload)}>
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    Create Drive Folder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {/* Google Forms */}
                                  <DropdownMenuItem onClick={() => handleCreateReviewForm(upload)}>
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    Create Review Form
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateFeedbackForm(upload)}>
                                    <FileQuestion className="h-4 w-4 mr-2" />
                                    Create Feedback Form
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateInspectionForm(upload)}>
                                    <HardHat className="h-4 w-4 mr-2" />
                                    Create Inspection Form
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateVariationForm(upload)}>
                                    <ClipboardCheck className="h-4 w-4 mr-2" />
                                    Create Variation Form
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete BOQ Upload?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete "{upload.file_name}" and all {upload.total_items_extracted} extracted items. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteMutation.mutate(upload)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BOQReviewDialog
        upload={selectedUpload}
        open={!!selectedUpload}
        onOpenChange={(open) => !open && setSelectedUpload(null)}
      />

      <BOQPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile}
        onConfirm={processWithSelectedContent}
      />

      <BOQProcessingWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setWizardUpload(null);
        }}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
        }}
        existingUpload={wizardUpload ? {
          id: wizardUpload.id,
          file_name: wizardUpload.file_name,
          file_path: wizardUpload.file_path,
          file_type: wizardUpload.file_type,
          metadata: {
            sourceDescription: wizardUpload.source_description || undefined,
            contractorName: wizardUpload.contractor_name || undefined,
            projectId: wizardUpload.project_id || undefined,
            province: wizardUpload.province || undefined,
            buildingType: wizardUpload.building_type || undefined,
            tenderDate: wizardUpload.tender_date ? new Date(wizardUpload.tender_date) : undefined,
          },
        } : null}
      />
    </div>
  );
};