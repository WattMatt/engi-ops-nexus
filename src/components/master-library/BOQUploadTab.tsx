import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Clock, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BOQReviewDialog } from "./BOQReviewDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BOQUpload {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  total_items_extracted: number;
  items_matched_to_master: number;
  source_description: string | null;
  contractor_name: string | null;
  created_at: string;
}

export const BOQUploadTab = () => {
  const [selectedUpload, setSelectedUpload] = useState<BOQUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sourceDescription, setSourceDescription] = useState("");
  const [contractorName, setContractorName] = useState("");
  const queryClient = useQueryClient();

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

      // Create upload record
      const { data: uploadRecord, error: recordError } = await supabase
        .from("boq_uploads")
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: fileExt,
          file_size: file.size,
          source_description: sourceDescription || null,
          contractor_name: contractorName || null,
          uploaded_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Read file content for extraction
      let fileContent = "";
      if (fileExt === "csv") {
        fileContent = await file.text();
      } else if (fileExt === "xlsx" || fileExt === "xls") {
        // For Excel, we need to read it differently
        // For now, we'll handle this on the server side
        fileContent = `[Excel file: ${file.name}]`;
      }

      // Call edge function to extract rates
      const { data: extractResult, error: extractError } = await supabase.functions.invoke(
        "extract-boq-rates",
        {
          body: {
            upload_id: uploadRecord.id,
            file_content: fileContent,
            file_type: fileExt,
          },
        }
      );

      if (extractError) {
        console.error("Extraction error:", extractError);
        // Don't throw - the upload is still saved, extraction can be retried
      }

      return uploadRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success("BOQ uploaded and processing started");
      setSourceDescription("");
      setContractorName("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload BOQ");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

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
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Matched</TableHead>
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
                          <span className="font-medium truncate max-w-[200px]">
                            {upload.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {upload.source_description || upload.contractor_name || "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(upload.status)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{upload.total_items_extracted}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{upload.items_matched_to_master}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(upload.created_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUpload(upload)}
                          disabled={upload.status === "pending" || upload.status === "processing"}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
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
