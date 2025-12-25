import React, { useEffect, useState, useMemo } from 'react';
import { FolderOpen, Building as BuildingIcon, Calendar, Loader, MoreVertical, Pencil, Trash2, Archive, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Building } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteDesign, updateDesignName } from '../utils/supabase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SavedDesign {
  id: string;
  name: string;
  created_at: string;
  project_id: string | null;
  project_name: string | null;
  project_number: string | null;
  design_purpose: string | null;
}

interface SavedDesignsGalleryProps {
  onLoadDesign: (designId: string) => void;
  onNewDesign: () => void;
  currentProjectId?: string | null;
}

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Uncategorized']));

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
      }));

      setDesigns(formattedDesigns);
      
      // Auto-expand all folders on initial load
      const purposes = new Set(formattedDesigns.map(d => d.design_purpose || 'Uncategorized'));
      setExpandedFolders(purposes);
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Natural sort function for strings with numbers (e.g., "Shop 1" before "Shop 10")
  const naturalSort = (a: string, b: string) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Group designs by design_purpose
  const groupedDesigns = useMemo(() => {
    const groups: Record<string, SavedDesign[]> = {};
    
    for (const design of designs) {
      const purpose = design.design_purpose || 'Uncategorized';
      if (!groups[purpose]) {
        groups[purpose] = [];
      }
      groups[purpose].push(design);
    }
    
    // Sort designs within each group numerically by name
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => naturalSort(a.name, b.name));
    }
    
    // Sort groups alphabetically, but keep "Uncategorized" at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return naturalSort(a, b);
    });
    
    return sortedKeys.map(key => ({ purpose: key, designs: groups[key] }));
  }, [designs]);

  const toggleFolder = (purpose: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(purpose)) {
        next.delete(purpose);
      } else {
        next.add(purpose);
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

  if (designs.length === 0) {
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
          <button 
            onClick={onNewDesign}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            + New Design
          </button>
        </div>

        <div className="space-y-4">
          {groupedDesigns.map(({ purpose, designs: groupDesigns }) => (
            <Collapsible
              key={purpose}
              open={expandedFolders.has(purpose)}
              onOpenChange={() => toggleFolder(purpose)}
            >
              <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg bg-card border border-border hover:bg-accent transition-colors group">
                <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                  <Folder className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-foreground">{purpose}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({groupDesigns.length} {groupDesigns.length === 1 ? 'design' : 'designs'})
                  </span>
                </div>
                {expandedFolders.has(purpose) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-2 ml-6 pl-6 border-l-2 border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                    {groupDesigns.map((design) => (
                      <div
                        key={design.id}
                        className="group relative flex flex-col p-4 rounded-lg bg-card hover:bg-accent transition-all duration-200 border border-border hover:border-primary hover:shadow-md"
                      >
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="p-1 rounded hover:bg-background/80 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRename(design)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
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
                          onClick={() => onLoadDesign(design.id)}
                          className="flex-1 flex flex-col text-left"
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
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

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
      </div>
    </div>
  );
};
