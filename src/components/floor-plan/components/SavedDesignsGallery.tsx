import React, { useEffect, useState } from 'react';
import { FolderOpen, Building as BuildingIcon, Calendar, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Building } from 'lucide-react';

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

      // Filter by current project if provided
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
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setLoading(false);
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => onLoadDesign(design.id)}
              className="group relative flex flex-col p-4 rounded-lg bg-card hover:bg-accent transition-all duration-200 text-left border border-border hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {design.name}
                  </h3>
                  {design.design_purpose && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                      {design.design_purpose}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                <Calendar className="h-3 w-3" />
                {new Date(design.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};