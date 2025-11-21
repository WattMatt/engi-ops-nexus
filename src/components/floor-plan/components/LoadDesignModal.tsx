import React, { useMemo, useState } from 'react';
import { FolderOpen, FilePlus, Trash2, FolderInput, Edit2, Filter, X } from 'lucide-react';
import { DesignListing, updateDesignName } from '../utils/supabase';
import { DesignPurpose } from '../types';
import { toast } from 'sonner';

interface LoadDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (designId: string) => void;
  onDelete: (designId: string, designName: string) => void;
  onNewDesign: () => void;
  onAssignToProject: (designId: string) => void;
  designs: DesignListing[];
  isLoading: boolean;
  currentProjectId?: string | null;
}

const LoadDesignModal: React.FC<LoadDesignModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoad, 
  onDelete, 
  onNewDesign, 
  onAssignToProject,
  designs, 
  isLoading,
  currentProjectId 
}) => {
  const [filterPurpose, setFilterPurpose] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique design purposes for filter
  const designPurposes = useMemo(() => {
    const purposes = new Set<string>();
    designs.forEach(d => {
      if (d.design_purpose) purposes.add(d.design_purpose);
    });
    return Array.from(purposes);
  }, [designs]);

  // Separate and filter designs
  const { unassignedDesigns, projectDesigns } = useMemo(() => {
    const unassigned: DesignListing[] = [];
    const projectSpecific: DesignListing[] = [];
    
    designs.forEach(design => {
      // Apply filter
      if (filterPurpose !== 'all' && design.design_purpose !== filterPurpose) {
        return;
      }
      
      if (!design.project_id) {
        unassigned.push(design);
      } else if (design.project_id === currentProjectId) {
        projectSpecific.push(design);
      }
    });
    
    return { unassignedDesigns: unassigned, projectDesigns: projectSpecific };
  }, [designs, currentProjectId, filterPurpose]);

  const handleStartEdit = (design: DesignListing) => {
    setEditingId(design.id);
    setEditingName(design.name);
  };

  const handleSaveEdit = async (designId: string) => {
    if (!editingName.trim()) {
      toast.error('Design name cannot be empty');
      return;
    }

    try {
      await updateDesignName(designId, editingName.trim());
      toast.success('Design renamed successfully');
      setEditingId(null);
      setEditingName('');
      // The design list will be refreshed on next modal open
    } catch (error) {
      console.error('Error renaming design:', error);
      toast.error('Failed to rename design');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-card rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[80vh] flex flex-col border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-2">Floor Plan Markup</h2>
        <p className="text-muted-foreground mb-6">Open a saved design or start a new markup</p>
        
        {/* New Design Button */}
        <button
          onClick={() => {
            onNewDesign();
            onClose();
          }}
          className="w-full flex items-center justify-between p-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-4"
        >
          <div className="flex items-center gap-3">
            <FilePlus className="h-6 w-6" />
            <div className="text-left">
              <p className="font-semibold">Start New Markup</p>
              <p className="text-sm opacity-90">Load a PDF file and begin marking up</p>
            </div>
          </div>
        </button>

        <div className="border-t border-border pt-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Saved Designs</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mb-4 p-3 bg-muted rounded-md space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design Purpose
              </label>
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              >
                <option value="all">All Designs</option>
                {designPurposes.map(purpose => (
                  <option key={purpose} value={purpose}>{purpose}</option>
                ))}
              </select>
              {filterPurpose !== 'all' && (
                <button
                  onClick={() => setFilterPurpose('all')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto space-y-6 pr-2 flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
                <p className="text-muted-foreground">Loading your designs...</p>
            </div>
          ) : (
            <>
              {/* Current Project Designs */}
              {currentProjectId && projectDesigns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Current Project</h4>
                  {projectDesigns.map(design => (
                    <div
                      key={design.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors border border-border"
                    >
                      {editingId === design.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(design.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(design.id)}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => onLoad(design.id)}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground">{design.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {design.design_purpose && <span className="text-primary">{design.design_purpose} • </span>}
                                {new Date(design.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(design);
                              }}
                              className="p-2 text-foreground hover:bg-muted-foreground/10 rounded-md transition-colors"
                              title="Edit design name"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(design.id, design.name);
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Delete design"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Unassigned Designs */}
              {unassignedDesigns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unassigned Designs</h4>
                    {currentProjectId && (
                      <p className="text-xs text-muted-foreground">Assign to current project to move here</p>
                    )}
                  </div>
                  {unassignedDesigns.map(design => (
                    <div
                      key={design.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors border border-border"
                    >
                      {editingId === design.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(design.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(design.id)}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => onLoad(design.id)}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <FolderOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground">{design.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {design.design_purpose && <span>{design.design_purpose} • </span>}
                                {new Date(design.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            {currentProjectId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignToProject(design.id);
                                }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Assign to current project"
                              >
                                <FolderInput className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(design);
                              }}
                              className="p-2 text-foreground hover:bg-muted-foreground/10 rounded-md transition-colors"
                              title="Edit design name"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(design.id, design.name);
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Delete design"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {projectDesigns.length === 0 && unassignedDesigns.length === 0 && (
                <div className="flex flex-col justify-center items-center h-32 text-center">
                    <p className="text-muted-foreground">You have no saved designs yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a new markup to get started!</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-md text-foreground bg-muted hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadDesignModal;
