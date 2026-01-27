import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useDropbox, DropboxFile } from "@/hooks/useDropbox";
import { DropboxConnectionBanner } from "@/components/storage/DropboxConnectionBanner";
import { 
  Folder, 
  File, 
  ChevronRight, 
  Home, 
  FolderPlus, 
  Loader2,
  ArrowLeft,
  Download,
  Cloud
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ImportFromDropboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: DropboxFile, content: ArrayBuffer) => void;
  allowedExtensions?: string[];
  title?: string;
  description?: string;
  multiple?: boolean;
}

export function ImportFromDropboxDialog({
  open,
  onOpenChange,
  onFileSelect,
  allowedExtensions,
  title = "Import from Dropbox",
  description = "Select a file from your Dropbox",
  multiple = false,
}: ImportFromDropboxDialogProps) {
  const { 
    isConnected, 
    listFolder, 
    downloadFile,
    createFolder
  } = useDropbox();
  const { toast } = useToast();

  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<DropboxFile[]>([]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadFolder = useCallback(async (path: string) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      // Use silent mode to prevent toast errors during folder browsing
      const entries = await listFolder(path, { silent: true });
      // Filter by allowed extensions if specified
      let filteredEntries = entries;
      if (allowedExtensions && allowedExtensions.length > 0) {
        filteredEntries = entries.filter(file => {
          if (file.type === 'folder') return true;
          const ext = file.name.toLowerCase().split('.').pop();
          return ext && allowedExtensions.some(allowed => 
            allowed.toLowerCase().replace('.', '') === ext
          );
        });
      }
      
      // Sort: folders first, then by name
      filteredEntries.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(filteredEntries);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, listFolder, allowedExtensions]);

  useEffect(() => {
    if (open && isConnected) {
      loadFolder(currentPath);
    }
  }, [open, currentPath, isConnected, loadFolder]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentPath('');
      setSelectedFiles([]);
    }
  }, [open]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles([]);
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

  const handleFileClick = (file: DropboxFile) => {
    if (file.type === 'folder') {
      navigateTo(file.path);
    } else {
      if (multiple) {
        setSelectedFiles(prev => {
          const isSelected = prev.some(f => f.id === file.id);
          if (isSelected) {
            return prev.filter(f => f.id !== file.id);
          }
          return [...prev, file];
        });
      } else {
        setSelectedFiles([file]);
      }
    }
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsDownloading(true);
    try {
      for (const file of selectedFiles) {
        const content = await downloadFile(file.path);
        if (content) {
          onFileSelect(file, content);
        } else {
          toast({
            title: "Download Failed",
            description: `Failed to download ${file.name}`,
            variant: "destructive",
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import file(s) from Dropbox",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : `/${newFolderName}`;
    const success = await createFolder(folderPath);
    
    if (success) {
      setNewFolderDialog(false);
      setNewFolderName('');
      loadFolder(currentPath);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            {allowedExtensions && allowedExtensions.length > 0 && (
              <span className="block mt-1 text-xs">
                Allowed file types: {allowedExtensions.join(', ')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-4">
            <DropboxConnectionBanner 
              title="Connect Dropbox to Import Files"
              description="You need to connect your Dropbox account before you can import files."
            />
          </div>
        ) : (
          <>
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
              <div className="flex-1" />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setNewFolderDialog(true)}
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                New Folder
              </Button>
            </div>

            {/* File List */}
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>This folder is empty</p>
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {files.map(file => {
                    const isSelected = selectedFiles.some(f => f.id === file.id);
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleFileClick(file)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleFileClick(file)}
                      >
                        {file.type === 'folder' ? (
                          <Folder className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          {file.type === 'file' && (
                            <p className="text-xs text-muted-foreground">
                              {file.size !== undefined && formatBytes(file.size)}
                              {file.modified && ` • ${format(new Date(file.modified), 'MMM d, yyyy')}`}
                            </p>
                          )}
                        </div>
                        {file.type === 'folder' && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        {isSelected && file.type === 'file' && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Selection Info */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                <span className="font-medium">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-muted-foreground">
                  ({selectedFiles.map(f => f.name).join(', ')})
                </span>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isConnected && (
            <Button 
              onClick={handleImport} 
              disabled={selectedFiles.length === 0 || isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
