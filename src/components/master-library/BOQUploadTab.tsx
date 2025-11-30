import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Clock, CheckCircle, XCircle, Eye, Loader2, Building2, MapPin, Calendar, Trash2, RefreshCw, MoreHorizontal, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BOQReviewDialog } from "./BOQReviewDialog";
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
  const [selectedUpload, setSelectedUpload] = useState<BOQUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sourceDescription, setSourceDescription] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedBuildingType, setSelectedBuildingType] = useState<string>("");
  const [tenderDate, setTenderDate] = useState<Date | undefined>();
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

  // Re-process upload mutation
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

      // Download file from storage
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

      // Call edge function - it now returns immediately and processes in background
      try {
        await supabase.functions.invoke(
          "extract-boq-rates",
          {
            body: {
              upload_id: upload.id,
              file_content: fileContent,
              file_type: fileExt,
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
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload BOQ Document
          </CardTitle>
          <CardDescription>
            Upload Excel, CSV, or PDF files to extract material rates using AI
          </CardDescription>
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
                          {upload.source_description || upload.contractor_name || "—"}
                        </div>
                        {upload.building_type && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {upload.building_type}
                          </Badge>
                        )}
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
                              onClick={() => reprocessMutation.mutate(upload)}
                              disabled={reprocessMutation.isPending}
                            >
                              {reprocessMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
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
                              <DropdownMenuItem 
                                onClick={() => reprocessMutation.mutate(upload)}
                                disabled={reprocessMutation.isPending || upload.status === "processing"}
                              >
                                <RefreshCw className={cn("h-4 w-4 mr-2", reprocessMutation.isPending && "animate-spin")} />
                                Re-process
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
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
    </div>
  );
};