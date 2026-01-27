import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDropbox, DropboxFile } from "@/hooks/useDropbox";
import { DropboxConnectionBanner } from "@/components/storage/DropboxConnectionBanner";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Folder, 
  ChevronRight, 
  Home, 
  FolderPlus, 
  Loader2,
  ArrowLeft,
  Cloud,
  Check,
  X,
  CheckCircle2
} from "lucide-react";

interface DropboxSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The file content to upload - can be base64, ArrayBuffer, or Blob */
  fileContent: string | ArrayBuffer | Blob | null;
  /** Suggested filename */
  filename: string;
  /** Content type of the file */
  contentType?: string;
  /** Optional callback after successful upload */
  onSuccess?: (path: string) => void;
  /** Default folder path in Dropbox */
  defaultFolder?: string;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
}

export function DropboxSaveDialog({
  open,
  onOpenChange,
  fileContent,
  filename,
  contentType = "application/pdf",
  onSuccess,
  defaultFolder = "",
  title = "Save to Dropbox",
  description = "Choose a folder and filename",
}: DropboxSaveDialogProps) {
  const { 
    isConnected, 
    listFolder, 
    uploadFile, 
    createFolder 
  } = useDropbox();
  const { toast } = useToast();

  const [currentPath, setCurrentPath] = useState(defaultFolder);
  const [folders, setFolders] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [editedFilename, setEditedFilename] = useState(filename);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadFolders = useCallback(async (path: string) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      const entries = await listFolder(path, { silent: true });
      // Filter to only show folders
      const folderEntries = entries
        .filter(e => e.type === 'folder')
        .sort((a, b) => a.name.localeCompare(b.name));
      setFolders(folderEntries);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, listFolder]);

  // Load folders when dialog opens or path changes
  useEffect(() => {
    if (open && isConnected) {
      loadFolders(currentPath);
    }
  }, [open, currentPath, isConnected, loadFolders]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setEditedFilename(filename);
      setUploadSuccess(false);
      if (defaultFolder) {
        setCurrentPath(defaultFolder);
      }
    }
  }, [open, filename, defaultFolder]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo(parts.length > 0 ? '/' + parts.join('/') : '');
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', path: '' }];
    let currentBreadcrumbPath = '';
    
    parts.forEach(part => {
      currentBreadcrumbPath += '/' + part;
      breadcrumbs.push({ name: part, path: currentBreadcrumbPath });
    });
    
    return breadcrumbs;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : `/${newFolderName}`;
    const success = await createFolder(folderPath);
    
    if (success) {
      setNewFolderName('');
      setShowNewFolderInput(false);
      // Navigate into the new folder
      setCurrentPath(folderPath);
    }
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

    if (!editedFilename.trim()) {
      toast({
        title: "Filename Required",
        description: "Please enter a filename",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Build the full path
      const fullPath = currentPath 
        ? `${currentPath}/${editedFilename}` 
        : `/${editedFilename}`;

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
          onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-4">
            <DropboxConnectionBanner 
              title="Connect Dropbox to Save Files"
              description="You need to connect your Dropbox account before you can save files."
            />
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <p className="text-lg font-medium">Saved Successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {currentPath || '/'}/{editedFilename}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm overflow-x-auto py-2 border-b">
              {currentPath && (
                <Button variant="ghost" size="sm" onClick={navigateUp} className="shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {getBreadcrumbs().map((crumb, index, arr) => (
                <div key={crumb.path} className="flex items-center shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => navigateTo(crumb.path)}
                  >
                    {index === 0 ? <Home className="h-4 w-4" /> : crumb.name}
                  </Button>
                  {index < arr.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {/* New Folder Input */}
            {showNewFolderInput ? (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNewFolderInput(true)}
                className="w-full"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create New Folder
              </Button>
            )}

            {/* Folder List */}
            <ScrollArea className="h-[200px] border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No subfolders here
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => navigateTo(folder.path)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigateTo(folder.path)}
                    >
                      <Folder className="h-5 w-5 text-primary shrink-0" />
                      <span className="flex-1 truncate">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected Path Display */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Label className="text-xs text-muted-foreground">Saving to:</Label>
              <span className="text-sm font-medium truncate">
                {currentPath || '/ (Root)'}
              </span>
            </div>

            {/* Filename Input */}
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={editedFilename}
                onChange={(e) => setEditedFilename(e.target.value)}
                placeholder="Enter filename"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!uploadSuccess && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              {isConnected && (
                <Button onClick={handleUpload} disabled={isUploading || !fileContent}>
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
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}