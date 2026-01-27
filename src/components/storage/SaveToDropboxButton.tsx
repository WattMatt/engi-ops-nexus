import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2, CheckCircle2, FolderOpen } from "lucide-react";
import { useDropbox } from "@/hooks/useDropbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SaveToDropboxButtonProps {
  /** The file content to upload - can be base64, ArrayBuffer, or Blob */
  fileContent: string | ArrayBuffer | Blob | null;
  /** Suggested filename */
  filename: string;
  /** Content type of the file */
  contentType?: string;
  /** Optional callback after successful upload */
  onSuccess?: (path: string) => void;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show as icon only */
  iconOnly?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Default folder path in Dropbox */
  defaultFolder?: string;
}

const COMMON_FOLDERS = [
  { label: "EngiOps Root", value: "/EngiOps" },
  { label: "Reports", value: "/EngiOps/Reports" },
  { label: "Cost Reports", value: "/EngiOps/Reports/Cost Reports" },
  { label: "Budgets", value: "/EngiOps/Reports/Budgets" },
  { label: "Floor Plans", value: "/EngiOps/Reports/Floor Plans" },
  { label: "Backups", value: "/EngiOps/Backups" },
  { label: "Documents", value: "/EngiOps/Documents" },
];

export function SaveToDropboxButton({
  fileContent,
  filename,
  contentType = "application/pdf",
  onSuccess,
  variant = "outline",
  size = "sm",
  iconOnly = false,
  buttonText = "Save to Dropbox",
  disabled = false,
  defaultFolder = "/EngiOps/Reports",
}: SaveToDropboxButtonProps) {
  const { isConnected, uploadFile, createFolder } = useDropbox();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder);
  const [customFolder, setCustomFolder] = useState("");
  const [editedFilename, setEditedFilename] = useState(filename);

  // Reset state when dialog opens
  const handleOpenDialog = () => {
    setEditedFilename(filename);
    setUploadSuccess(false);
    setIsDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!fileContent) {
      toast({
        title: "No Content",
        description: "No file content available to upload",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Determine the target folder
      const targetFolder = selectedFolder === "custom" ? customFolder : selectedFolder;
      
      if (!targetFolder) {
        throw new Error("Please select or enter a folder path");
      }

      // Ensure folder exists
      await createFolder(targetFolder);

      // Build the full path
      const fullPath = `${targetFolder}/${editedFilename}`;

      // Convert content to appropriate format
      let uploadContent: string | ArrayBuffer;
      
      if (fileContent instanceof Blob) {
        uploadContent = await fileContent.arrayBuffer();
      } else {
        uploadContent = fileContent;
      }

      const success = await uploadFile(fullPath, uploadContent, contentType);

      if (success) {
        setUploadSuccess(true);
        onSuccess?.(fullPath);
        
        // Close dialog after a brief delay to show success
        setTimeout(() => {
          setIsDialogOpen(false);
          setUploadSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Dropbox upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload to Dropbox",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return null; // Don't show button if not connected
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={disabled || !fileContent}
        title={buttonText}
      >
        {iconOnly ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <>
            <Cloud className="h-4 w-4 mr-2" />
            {buttonText}
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Save to Dropbox
            </DialogTitle>
            <DialogDescription>
              Choose where to save the file in your Dropbox
            </DialogDescription>
          </DialogHeader>

          {uploadSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
              <p className="text-lg font-medium">Saved Successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFolder}/{editedFilename}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folder">Folder</Label>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_FOLDERS.map((folder) => (
                      <SelectItem key={folder.value} value={folder.value}>
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          {folder.label}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom path...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedFolder === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customFolder">Custom Path</Label>
                  <Input
                    id="customFolder"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="/EngiOps/MyFolder"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="filename">Filename</Label>
                <Input
                  id="filename"
                  value={editedFilename}
                  onChange={(e) => setEditedFilename(e.target.value)}
                />
              </div>

              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                <strong>Full path:</strong>{" "}
                {selectedFolder === "custom" ? customFolder : selectedFolder}/{editedFilename}
              </div>
            </div>
          )}

          <DialogFooter>
            {!uploadSuccess && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Save to Dropbox
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
