import React, { useMemo } from 'react';
import { FolderOpen, FilePlus, Trash2 } from 'lucide-react';
import { DesignListing } from '../utils/supabase';
import { DesignPurpose } from '../types';

interface LoadDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (designId: string) => void;
  onDelete: (designId: string, designName: string) => void;
  onNewDesign: () => void;
  designs: DesignListing[];
  isLoading: boolean;
}

const LoadDesignModal: React.FC<LoadDesignModalProps> = ({ isOpen, onClose, onLoad, onDelete, onNewDesign, designs, isLoading }) => {
  // Group designs by purpose
  const groupedDesigns = useMemo(() => {
    const groups: Record<string, DesignListing[]> = {};
    designs.forEach(design => {
      const purpose = design.design_purpose || 'Other';
      if (!groups[purpose]) {
        groups[purpose] = [];
      }
      groups[purpose].push(design);
    });
    return groups;
  }, [designs]);

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
        
        <div className="overflow-y-auto space-y-4 pr-2 flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
                <p className="text-muted-foreground">Loading your designs...</p>
            </div>
          ) : Object.keys(groupedDesigns).length > 0 ? (
            Object.entries(groupedDesigns).map(([purpose, designList]) => (
              <div key={purpose} className="space-y-2">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">{purpose}</h4>
                {designList.map(design => (
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
                        <p className="text-xs text-muted-foreground">Saved: {new Date(design.createdAt).toLocaleString()}</p>
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
            ))
          ) : (
            <div className="flex flex-col justify-center items-center h-32 text-center">
                <p className="text-muted-foreground">You have no saved designs yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Start a new markup to get started!</p>
            </div>
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
