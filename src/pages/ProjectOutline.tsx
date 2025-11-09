import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectOutlineOverview } from "@/components/project-outline/ProjectOutlineOverview";
import { CreateProjectOutlineDialog } from "@/components/project-outline/CreateProjectOutlineDialog";

const ProjectOutline = () => {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOutlineId, setSelectedOutlineId] = useState<string | null>(null);

  const currentProjectId = localStorage.getItem("currentProjectId");

  const { data: outlines, isLoading } = useQuery({
    queryKey: ["project-outlines", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      
      const { data, error } = await supabase
        .from("project_outlines")
        .select("*")
        .eq("project_id", currentProjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentProjectId,
  });

  const handleOutlineCreated = (outlineId: string) => {
    setSelectedOutlineId(outlineId);
    setCreateDialogOpen(false);
  };

  if (selectedOutlineId) {
    return (
      <ProjectOutlineOverview
        outlineId={selectedOutlineId}
        onBack={() => setSelectedOutlineId(null)}
      />
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Outline</h1>
          <p className="text-muted-foreground">
            Create baseline documents with project details and specifications
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Outline
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading outlines...</p>
          </CardContent>
        </Card>
      ) : outlines && outlines.length > 0 ? (
        <div className="grid gap-4">
          {outlines.map((outline) => (
            <Card
              key={outline.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOutlineId(outline.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>{outline.project_name}</CardTitle>
                      <CardDescription>
                        {outline.revision} • {new Date(outline.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No project outlines yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first baseline document to get started
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Outline
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateProjectOutlineDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onOutlineCreated={handleOutlineCreated}
      />
    </div>
  );
};

export default ProjectOutline;
