import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { CreateSpecificationDialog } from "@/components/specifications/CreateSpecificationDialog";
import { Badge } from "@/components/ui/badge";

const Specifications = () => {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: specifications = [], isLoading, refetch } = useQuery({
    queryKey: ["specifications", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_specifications")
        .select("*")
        .eq("project_id", projectId)
        .order("spec_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleSpecClick = (specId: string) => {
    navigate(`/dashboard/specifications/${specId}`);
  };

  if (isLoading) {
    return <div>Loading specifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Specifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage technical specifications and documentation
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Specification
        </Button>
      </div>

      {specifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No specifications yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first project specification
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Specification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {specifications.map((spec) => (
            <Card
              key={spec.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSpecClick(spec.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={spec.status === 'draft' ? 'secondary' : 'default'}>
                    {spec.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {spec.revision}
                  </span>
                </div>
                <CardTitle className="text-lg">{spec.title}</CardTitle>
                <CardDescription>
                  {spec.spec_type} - {spec.spec_number}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(spec.spec_date), "PPP")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSpecificationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId || ""}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Specifications;
