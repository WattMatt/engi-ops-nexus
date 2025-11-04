import React, { useMemo } from 'react';
import { FolderOpen, FilePlus, Trash2, FolderInput } from 'lucide-react';
import { DesignListing } from '../utils/supabase';
import { DesignPurpose } from '../types';

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
  // Separate designs into unassigned and project-specific
  const { unassignedDesigns, projectDesigns } = useMemo(() => {
    const unassigned: DesignListing[] = [];
    const projectSpecific: DesignListing[] = [];
    
    designs.forEach(design => {
      if (!design.project_id) {
        unassigned.push(design);
      } else if (design.project_id === currentProjectId) {
        projectSpecific.push(design);
      }
    });
    
    return { unassignedDesigns: unassigned, projectDesigns: projectSpecific };
  }, [designs, currentProjectId]);

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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Saved Designs</h3>
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
                      className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors"
                    >
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(design.id, design.name);
                        }}
                        className="ml-2 p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete design"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                      className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors"
                    >
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
                      <div className="flex items-center gap-2">
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
                            onDelete(design.id, design.name);
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete design"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
