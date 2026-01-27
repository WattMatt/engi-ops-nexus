import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDropbox, DropboxFile } from "@/hooks/useDropbox";
import { 
  Folder, 
  File, 
  ChevronRight, 
  Home, 
  Upload, 
  FolderPlus, 
  Download, 
  Trash2, 
  Loader2,
  RefreshCw,
  ArrowLeft,
  AlertCircle
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DropboxBrowserProps {
  onFileSelect?: (file: DropboxFile) => void;
  selectionMode?: boolean;
  initialPath?: string;
}

export function DropboxBrowser({ 
  onFileSelect, 
  selectionMode = false,
  initialPath = ''
}: DropboxBrowserProps) {
  const { 
    isConnected,
    isLoading: connectionLoading,
    listFolder, 
    createFolder, 
    getDownloadLink, 
    deleteItem,
    uploadFile
  } = useDropbox();

  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DropboxFile | null>(null);
  const mountedRef = useRef(true);
  const loadingPathRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Dialogs
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DropboxFile | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort any in-flight requests
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadFolder = useCallback(async (path: string, options?: { force?: boolean }) => {
    if (!isConnected) return;
    
    const force = options?.force ?? false;
    
    // Skip if already loading this path (unless forced)
    if (!force && loadingPathRef.current === path) {
      console.log('[DropboxBrowser] Skipping duplicate load for:', path);
      return;
    }
    
    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    loadingPathRef.current = path;
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const entries = await listFolder(path, { silent: true });
      
      if (!mountedRef.current) return;
      
      // Sort: folders first, then by name
      entries.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(entries);
      setLoadError(null);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('Failed to load folder:', error);
      setLoadError('Failed to load folder contents');
      setFiles([]);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        loadingPathRef.current = null;
      }
    }
  }, [isConnected, listFolder]);

  // Load folder when path changes or when connection becomes ready
  useEffect(() => {
    console.log('[DropboxBrowser] Effect triggered', { isConnected, connectionLoading, currentPath });
    if (isConnected && !connectionLoading) {
      loadFolder(currentPath);
    }
  }, [currentPath, isConnected, connectionLoading, loadFolder]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
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
      setSelectedFile(file);
      if (selectionMode && onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleDownload = async (file: DropboxFile) => {
    const link = await getDownloadLink(file.path);
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : `/${newFolderName}`;
    const success = await createFolder(folderPath);
    
    if (success) {
      setNewFolderDialog(false);
      setNewFolderName('');
      loadFolder(currentPath, { force: true });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    const success = await deleteItem(itemToDelete.path);
    
    if (success) {
      setDeleteDialog(false);
      setItemToDelete(null);
      loadFolder(currentPath, { force: true });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (content) {
        const uploadPath = currentPath ? `${currentPath}/${file.name}` : `/${file.name}`;
        const success = await uploadFile(uploadPath, content as ArrayBuffer, file.type);
        if (success) {
          loadFolder(currentPath, { force: true });
        }
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    event.target.value = '';
  };

  // Show loading while connection is being checked
  if (connectionLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Checking connection...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Connect to Dropbox to browse files</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">File Browser</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadFolder(currentPath, { force: true })}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNewFolderDialog(true)}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </span>
              </Button>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto py-2">
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
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{loadError}</span>
                  <Button variant="outline" size="sm" onClick={() => loadFolder(currentPath, { force: true })}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              This folder is empty
            </div>
          ) : (
            <div className="space-y-1">
              {files.map(file => (
                <ContextMenu key={file.id}>
                  <ContextMenuTrigger>
                    <div
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        selectedFile?.id === file.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleFileClick(file)}
                      role="button"
                      tabIndex={0}
                      onDoubleClick={() => file.type === 'file' && handleDownload(file)}
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
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {file.type === 'file' && (
                      <ContextMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem 
                      onClick={() => {
                        setItemToDelete(file);
                        setDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === 'folder' ? 'Folder' : 'File'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
