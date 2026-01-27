import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDropbox, DropboxFile } from "@/hooks/useDropbox";
import { 
  Folder, 
  ChevronRight, 
  Home, 
  FolderPlus, 
  Loader2,
  Check,
  X,
  Cloud,
  CloudOff,
  ArrowLeft
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DropboxFolderPickerProps {
  value?: string | null;
  onChange: (path: string | null) => void;
  projectName?: string;
}

export function DropboxFolderPicker({ 
  value, 
  onChange,
  projectName 
}: DropboxFolderPickerProps) {
  const { 
    isConnected, 
    listFolder, 
    createFolder 
  } = useDropbox();

  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const loadFolders = useCallback(async (path: string) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      const entries = await listFolder(path);
      // Filter to only show folders
      const folderEntries = entries
        .filter(e => e.type === 'folder')
        .sort((a, b) => a.name.localeCompare(b.name));
      setFolders(folderEntries);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, listFolder]);

  useEffect(() => {
    if (open) {
      loadFolders(currentPath);
    }
  }, [open, currentPath, loadFolders]);

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

  const handleSelectFolder = () => {
    onChange(currentPath || '/');
    setOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : `/${newFolderName}`;
    const success = await createFolder(folderPath);
    
    if (success) {
      setNewFolderName('');
      setShowNewFolderInput(false);
      loadFolders(currentPath);
    }
  };

  const handleClearFolder = () => {
    onChange(null);
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            Dropbox Not Connected
          </CardTitle>
          <CardDescription className="text-xs">
            Connect Dropbox in Backup & Recovery settings to enable project file sync
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          Dropbox Folder
        </CardTitle>
        <CardDescription className="text-xs">
          Select a folder for project exports and files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input 
              value={value || ''} 
              placeholder="No folder selected"
              readOnly
              className="bg-muted/50"
            />
          </div>
          
          {value && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClearFolder}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <Folder className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Select Dropbox Folder</DialogTitle>
                <DialogDescription>
                  Choose a folder for {projectName ? `"${projectName}"` : 'this project'}
                </DialogDescription>
              </DialogHeader>
              
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
              <ScrollArea className="h-[250px] border rounded-lg">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No subfolders in this directory
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
                <Label className="text-xs text-muted-foreground">Selected:</Label>
                <span className="text-sm font-medium truncate">
                  {currentPath || '/ (Root)'}
                </span>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSelectFolder}>
                  <Check className="h-4 w-4 mr-2" />
                  Select This Folder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
