import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, FileText, Folder } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { HandoverFolder } from "./types";

interface UploadToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentCategory: string;
  folders: HandoverFolder[];
  currentFolderId: string | null;
}

export const UploadToFolderDialog = ({
  open,
  onOpenChange,
  projectId,
  documentCategory,
  folders,
  currentFolderId,
}: UploadToFolderDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentFolderId || "root"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("No files selected");

      const { data: user } = await supabase.auth.getUser();
      const totalFiles = files.length;
      let uploadedCount = 0;
      const folderId = selectedFolderId === "root" ? null : selectedFolderId;

      for (const file of files) {
        // Upload file to storage
        const filePath = `${projectId}/${documentCategory}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("handover-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("handover-documents").getPublicUrl(filePath);

        // Insert document record with folder reference
        const { error: insertError } = await supabase
          .from("handover_documents")
          .insert({
            project_id: projectId,
            document_name: file.name,
            document_type: documentCategory,
            file_url: publicUrl,
            source_type: "upload",
            file_size: file.size,
            added_by: user.user?.id,
            folder_id: folderId,
          });

        if (insertError) throw insertError;

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`,
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-folder-documents", projectId, documentCategory],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-documents-count", projectId],
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const resetForm = () => {
    setFiles([]);
    setUploadProgress(0);
    setSelectedFolderId(currentFolderId || "root");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload documents to the selected folder
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Folder Selection */}
            <div className="space-y-2">
              <Label>Destination Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Root (No folder)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder.folder_path || folder.folder_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Drop Zone */}
            <div className="space-y-2">
              <Label>Files</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Support for PDFs, images, and documents
                  </p>
                </label>
              </div>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={uploadMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading {Math.round(uploadProgress)}%...
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadMutation.isPending || files.length === 0}
            >
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload {files.length > 0 && `(${files.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
