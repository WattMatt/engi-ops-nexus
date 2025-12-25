import React, { useState } from 'react';
import { FolderPlus, Pencil, Trash2, ChevronRight, ChevronDown, Folder, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string | null;
  display_order: number;
  children: FolderNode[];
}

interface FolderManagementPanelProps {
  folders: FolderNode[];
  onFoldersChange: () => void;
  currentProjectId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FolderManagementPanel: React.FC<FolderManagementPanelProps> = ({
  folders,
  onFoldersChange,
  currentProjectId,
  isOpen,
  onClose,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<FolderNode | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [parentForNewFolder, setParentForNewFolder] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase.from('floor_plan_folders').insert({
        name: newFolderName.trim(),
        parent_id: parentForNewFolder,
        project_id: currentProjectId || null,
      });

      if (error) throw error;

      toast.success('Folder created successfully');
      setCreateDialogOpen(false);
      setNewFolderName('');
      setParentForNewFolder(null);
      onFoldersChange();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder || !renameValue.trim()) return;

    try {
      const { error } = await supabase
        .from('floor_plan_folders')
        .update({ name: renameValue.trim() })
        .eq('id', editingFolder.id);

      if (error) throw error;

      toast.success('Folder renamed successfully');
      setRenameDialogOpen(false);
      setEditingFolder(null);
      setRenameValue('');
      onFoldersChange();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folder: FolderNode) => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"? Items inside will be moved to the root level.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('floor_plan_folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;

      toast.success('Folder deleted successfully');
      onFoldersChange();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const openCreateDialog = (parentId: string | null = null) => {
    setParentForNewFolder(parentId);
    setNewFolderName('');
    setCreateDialogOpen(true);
  };

  const openRenameDialog = (folder: FolderNode) => {
    setEditingFolder(folder);
    setRenameValue(folder.name);
    setRenameDialogOpen(true);
  };

  const renderFolder = (folder: FolderNode, depth: number = 0) => {
    const hasChildren = folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id} style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-2 py-2 px-2 rounded hover:bg-accent group">
          <button
            onClick={() => hasChildren && toggleFolder(folder.id)}
            className="p-0.5"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
          </button>
          <Folder className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm">{folder.name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openCreateDialog(folder.id)}
              className="p-1 rounded hover:bg-background"
              title="Add subfolder"
            >
              <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => openRenameDialog(folder)}
              className="p-1 rounded hover:bg-background"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleDeleteFolder(folder)}
              className="p-1 rounded hover:bg-background"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Manage Folders
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button
              onClick={() => openCreateDialog(null)}
              variant="outline"
              className="w-full"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Create New Folder
            </Button>

            <ScrollArea className="h-[300px] border rounded-lg p-2">
              {folders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No folders yet. Create one to organize your designs.
                </div>
              ) : (
                folders.map(folder => renderFolder(folder))
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentForNewFolder ? 'Create Subfolder' : 'Create New Folder'}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
