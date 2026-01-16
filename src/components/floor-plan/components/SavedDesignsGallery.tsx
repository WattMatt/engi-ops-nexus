import React, { useEffect, useState, useMemo } from 'react';
import { FolderOpen, Calendar, Loader, MoreVertical, Pencil, Trash2, Archive, ChevronRight, ChevronDown, Folder, FolderPlus, Settings, Move, Copy, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Building } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteDesign, updateDesignName, duplicateDesign } from '../utils/supabase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFolders } from '../hooks/useFolders';
import { FolderManagementPanel, type FolderNode } from './FolderManagementPanel';
import { MoveToFolderDialog } from './MoveToFolderDialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/components/ui/context-menu';
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';

interface SavedDesign {
  id: string;
  name: string;
  created_at: string;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  design_purpose: string | null;
  folder_id: string | null;
}

interface SavedDesignsGalleryProps {
  onLoadDesign: (designId: string) => void;
  onNewDesign: () => void;
  currentProjectId?: string | null;
}

// Natural sort function for strings with numbers (e.g., "Shop 1" before "Shop 10")
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

export const SavedDesignsGallery: React.FC<SavedDesignsGalleryProps> = ({ 
  onLoadDesign,
  onNewDesign,
  currentProjectId
}) => {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<SavedDesign | null>(null);
  const [newName, setNewName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderManagementOpen, setFolderManagementOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderForCreate, setParentFolderForCreate] = useState<string | null>(null);
  const [draggedDesign, setDraggedDesign] = useState<SavedDesign | null>(null);
  
  // Duplicate enhancements state
  const [duplicatingDesignId, setDuplicatingDesignId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [isBulkDuplicating, setIsBulkDuplicating] = useState(false);

  const { folders, flatFolders, refetch: refetchFolders, getFolderPath } = useFolders(currentProjectId);

  useEffect(() => {
    fetchDesigns();
  }, [currentProjectId]);

  const fetchDesigns = async () => {
    try {
      let query = supabase
        .from('floor_plan_projects')
        .select(`
          id,
          name,
          created_at,
          project_id,
          design_purpose,
          folder_id,
          projects (
            name,
            project_number
          )
        `);

      if (currentProjectId) {
        query = query.eq('project_id', currentProjectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDesigns: SavedDesign[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        created_at: item.created_at,
        project_id: item.project_id,
        project_name: item.projects?.name || null,
        project_number: item.projects?.project_number || null,
        design_purpose: item.design_purpose,
        folder_id: item.folder_id,
      }));

      setDesigns(formattedDesigns);
      
      // Auto-expand all folders on initial load
      const folderIds = new Set(flatFolders.map(f => f.id));
      folderIds.add('uncategorized');
      setExpandedFolders(folderIds);
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group designs by folder hierarchy
  const groupedDesigns = useMemo(() => {
    const folderDesigns: Record<string, SavedDesign[]> = {};
    const uncategorized: SavedDesign[] = [];

    for (const design of designs) {
      if (design.folder_id) {
        if (!folderDesigns[design.folder_id]) {
          folderDesigns[design.folder_id] = [];
        }
        folderDesigns[design.folder_id].push(design);
      } else {
        uncategorized.push(design);
      }
    }

    // Sort designs within each folder by name (natural sort)
    for (const key of Object.keys(folderDesigns)) {
      folderDesigns[key].sort((a, b) => naturalSort(a.name, b.name));
    }
    uncategorized.sort((a, b) => naturalSort(a.name, b.name));

    return { folderDesigns, uncategorized };
  }, [designs]);

  // Calculate total design count for a folder including all subfolders recursively
  const getTotalDesignCount = (folder: FolderNode): number => {
    const directCount = groupedDesigns.folderDesigns[folder.id]?.length || 0;
    const childrenCount = folder.children.reduce((sum, child) => sum + getTotalDesignCount(child), 0);
    return directCount + childrenCount;
  };

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

  const handleRename = (design: SavedDesign) => {
    setSelectedDesign(design);
    setNewName(design.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedDesign || !newName.trim()) return;
    
    try {
      await updateDesignName(selectedDesign.id, newName.trim());
      toast.success('Design renamed successfully');
      setRenameDialogOpen(false);
      fetchDesigns();
    } catch (error) {
      console.error('Error renaming design:', error);
      toast.error('Failed to rename design');
    }
  };

  const handleDelete = async (design: SavedDesign) => {
    if (!confirm(`Are you sure you want to delete "${design.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDesign(design.id);
      toast.success('Design deleted successfully');
      fetchDesigns();
    } catch (error) {
      console.error('Error deleting design:', error);
      toast.error('Failed to delete design');
    }
  };

  const handleArchive = async (design: SavedDesign) => {
    toast.info('Archive functionality coming soon');
  };

  const handleDuplicate = async (design: SavedDesign) => {
    setDuplicatingDesignId(design.id);
    try {
      const { name: newName } = await duplicateDesign(design.id);
      toast.success(`Created copy: "${newName}"`);
      fetchDesigns();
    } catch (error) {
      console.error('Error duplicating design:', error);
      toast.error('Failed to duplicate design');
    } finally {
      setDuplicatingDesignId(null);
    }
  };

  const handleDuplicateToFolder = async (design: SavedDesign, folderId: string | null) => {
    setDuplicatingDesignId(design.id);
    try {
      const { name: newName } = await duplicateDesign(design.id, folderId);
      const folderName = folderId 
        ? flatFolders.find(f => f.id === folderId)?.name || 'folder'
        : 'Uncategorized';
      toast.success(`Created "${newName}" in ${folderName}`);
      fetchDesigns();
    } catch (error) {
      console.error('Error duplicating design:', error);
      toast.error('Failed to duplicate design');
    } finally {
      setDuplicatingDesignId(null);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedDesigns.size === 0) return;
    
    setIsBulkDuplicating(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const designId of selectedDesigns) {
      try {
        await duplicateDesign(designId);
        successCount++;
      } catch (error) {
        console.error(`Error duplicating design ${designId}:`, error);
        failCount++;
      }
    }
    
    setIsBulkDuplicating(false);
    setSelectedDesigns(new Set());
    setSelectionMode(false);
    fetchDesigns();
    
    if (failCount === 0) {
      toast.success(`Successfully duplicated ${successCount} designs`);
    } else {
      toast.warning(`Duplicated ${successCount} designs, ${failCount} failed`);
    }
  };

  const toggleDesignSelection = (designId: string) => {
    setSelectedDesigns(prev => {
      const next = new Set(prev);
      if (next.has(designId)) {
        next.delete(designId);
      } else {
        next.add(designId);
      }
      return next;
    });
  };

  const handleMoveDesign = (design: SavedDesign) => {
    setSelectedDesign(design);
    setMoveDialogOpen(true);
  };

  const handleCreateSubfolder = (parentId: string | null) => {
    setParentFolderForCreate(parentId);
    setNewFolderName('');
    setCreateFolderDialogOpen(true);
  };

  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase.from('floor_plan_folders').insert({
        name: newFolderName.trim(),
        parent_id: parentFolderForCreate,
        project_id: currentProjectId || null,
      });

      if (error) throw error;

      toast.success('Folder created successfully');
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      refetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, design: SavedDesign) => {
    setDraggedDesign(design);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (!draggedDesign) return;

    try {
      const { error } = await supabase
        .from('floor_plan_projects')
        .update({ folder_id: folderId })
        .eq('id', draggedDesign.id);

      if (error) throw error;

      toast.success(`Moved "${draggedDesign.name}" successfully`);
      fetchDesigns();
    } catch (error) {
      console.error('Error moving design:', error);
      toast.error('Failed to move design');
    } finally {
      setDraggedDesign(null);
    }
  };

  const renderFolderWithDesigns = (folder: FolderNode, depth: number = 0): React.ReactNode => {
    const folderDesigns = groupedDesigns.folderDesigns[folder.id] || [];
    const hasContent = folderDesigns.length > 0 || folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const totalDesignCount = getTotalDesignCount(folder);

    return (
      <div key={folder.id} style={{ marginLeft: depth * 24 }}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnFolder(e, folder.id)}
              className={`transition-colors ${draggedDesign ? 'ring-2 ring-primary/50 ring-dashed rounded-lg' : ''}`}
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg bg-card border border-border hover:bg-accent transition-colors group">
                  <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                    <Folder className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-foreground">{folder.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({totalDesignCount} {totalDesignCount === 1 ? 'design' : 'designs'})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 ml-6 pl-6 border-l-2 border-border">
                    {/* Subfolders */}
                    {folder.children.length > 0 && (
                      <div className="space-y-2 py-2">
                        {folder.children.map(child => renderFolderWithDesigns(child, 0))}
                      </div>
                    )}
                    
                    {/* Designs in this folder */}
                    {folderDesigns.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                        {folderDesigns.map((design) => renderDesignCard(design))}
                      </div>
                    )}

                    {!hasContent && (
                      <div className="py-4 text-center text-muted-foreground text-sm">
                        Empty folder - drag items here or create a subfolder
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => handleCreateSubfolder(folder.id)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Subfolder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    );
  };

  const renderDesignCard = (design: SavedDesign) => {
    const isDuplicating = duplicatingDesignId === design.id;
    const isSelected = selectedDesigns.has(design.id);
    
    return (
      <ContextMenu key={design.id}>
        <ContextMenuTrigger>
          <div
            draggable={!selectionMode}
            onDragStart={(e) => !selectionMode && handleDragStart(e, design)}
            className={`group relative flex flex-col p-4 rounded-lg bg-card hover:bg-accent transition-all duration-200 border hover:shadow-md ${
              isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary'
            } ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
            onClick={selectionMode ? () => toggleDesignSelection(design.id) : undefined}
          >
            {/* Loading overlay during duplication */}
            {isDuplicating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                <div className="flex items-center gap-2 text-primary">
                  <Loader className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Duplicating...</span>
                </div>
              </div>
            )}

            {/* Selection checkbox */}
            {selectionMode && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleDesignSelection(design.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-1 rounded hover:bg-background/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isDuplicating}
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRename(design)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(design)} disabled={isDuplicating}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={isDuplicating}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate to Folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => handleDuplicateToFolder(design, null)}>
                        <Folder className="h-4 w-4 mr-2" />
                        Uncategorized (Root)
                      </DropdownMenuItem>
                      {flatFolders.map(folder => (
                        <DropdownMenuItem 
                          key={folder.id}
                          onClick={() => handleDuplicateToFolder(design, folder.id)}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          {getFolderPath(folder.id)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => handleMoveDesign(design)}>
                    <Move className="h-4 w-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleArchive(design)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(design)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <button
              onClick={selectionMode ? undefined : () => onLoadDesign(design.id)}
              className={`flex-1 flex flex-col text-left ${selectionMode ? 'ml-6' : ''}`}
              disabled={isDuplicating}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {design.name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                <Calendar className="h-3 w-3" />
                {new Date(design.created_at).toLocaleDateString()}
              </div>
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onLoadDesign(design.id)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Open
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleRename(design)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleDuplicate(design)} disabled={isDuplicating}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={isDuplicating}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate to Folder
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => handleDuplicateToFolder(design, null)}>
                <Folder className="h-4 w-4 mr-2" />
                Uncategorized (Root)
              </ContextMenuItem>
              {flatFolders.map(folder => (
                <ContextMenuItem 
                  key={folder.id}
                  onClick={() => handleDuplicateToFolder(design, folder.id)}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  {getFolderPath(folder.id)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Move className="h-4 w-4 mr-2" />
              Move to Folder
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => handleDropOnFolder({ preventDefault: () => {} } as any, null)}>
                <Folder className="h-4 w-4 mr-2" />
                Uncategorized (Root)
              </ContextMenuItem>
              {flatFolders.map(folder => (
                <ContextMenuItem 
                  key={folder.id}
                  onClick={() => handleDropOnFolder({ preventDefault: () => {} } as any, folder.id)}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  {getFolderPath(folder.id)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => handleDelete(design)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-muted/30">
        <div className="text-center">
          <Loader className="mx-auto h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your designs...</p>
        </div>
      </div>
    );
  }

  if (designs.length === 0 && folders.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center bg-muted/30">
        <div className="text-center p-8 border-2 border-dashed border-border rounded-lg max-w-md">
          <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">
            {currentProjectId ? 'No Designs for This Project' : 'Load a PDF Floor Plan'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {currentProjectId 
              ? 'Start a new floor plan markup for this project.' 
              : 'Use the toolbar on the left to begin your project.'}
          </p>
          <button 
            onClick={onNewDesign}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Start New Markup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/30 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {currentProjectId ? 'Project Floor Plan Designs' : 'Your Floor Plan Designs'}
            </h1>
            <p className="text-muted-foreground mt-1">Select a design to continue working or start a new one</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedDesigns(new Set());
              }}
            >
              {selectionMode ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Cancel Selection
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select Multiple
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setFolderManagementOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Folders
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateSubfolder(null)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <Button onClick={onNewDesign}>
              + New Design
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Folders with their designs */}
          {folders.map(folder => renderFolderWithDesigns(folder))}

          {/* Uncategorized designs */}
          {groupedDesigns.uncategorized.length > 0 && (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnFolder(e, null)}
              className={`transition-colors ${draggedDesign ? 'ring-2 ring-primary/50 ring-dashed rounded-lg' : ''}`}
            >
              <Collapsible
                open={expandedFolders.has('uncategorized')}
                onOpenChange={() => toggleFolder('uncategorized')}
              >
                <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg bg-card border border-border hover:bg-accent transition-colors group">
                  <div className="p-2 bg-muted rounded group-hover:bg-muted/80 transition-colors">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-foreground">Uncategorized</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({groupedDesigns.uncategorized.length} {groupedDesigns.uncategorized.length === 1 ? 'design' : 'designs'})
                    </span>
                  </div>
                  {expandedFolders.has('uncategorized') ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-2 ml-6 pl-6 border-l-2 border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                      {groupedDesigns.uncategorized.map((design) => renderDesignCard(design))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Bulk Action Toolbar */}
        {selectionMode && selectedDesigns.size > 0 && (
          <div className="sticky bottom-4 flex justify-center mt-6 z-30">
            <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">
                {selectedDesigns.size} selected
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkDuplicate}
                disabled={isBulkDuplicating}
              >
                {isBulkDuplicating ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicate Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDesigns(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Design</DialogTitle>
            </DialogHeader>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameSubmit}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Folder Dialog */}
        <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {parentFolderForCreate ? 'Create Subfolder' : 'Create New Folder'}
              </DialogTitle>
            </DialogHeader>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderSubmit();
              }}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolderSubmit}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move to Folder Dialog */}
        {selectedDesign && (
          <MoveToFolderDialog
            isOpen={moveDialogOpen}
            onClose={() => {
              setMoveDialogOpen(false);
              setSelectedDesign(null);
            }}
            itemId={selectedDesign.id}
            itemName={selectedDesign.name}
            folders={folders}
            currentFolderId={selectedDesign.folder_id}
            onMove={() => {
              fetchDesigns();
              refetchFolders();
            }}
          />
        )}

        {/* Folder Management Panel */}
        <FolderManagementPanel
          folders={folders}
          onFoldersChange={refetchFolders}
          currentProjectId={currentProjectId}
          isOpen={folderManagementOpen}
          onClose={() => setFolderManagementOpen(false)}
        />
      </div>
    </div>
  );
};
