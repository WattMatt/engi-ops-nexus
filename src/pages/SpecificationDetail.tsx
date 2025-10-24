import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpecificationOverview } from "@/components/specifications/SpecificationOverview";
import { SpecificationTerms } from "@/components/specifications/SpecificationTerms";
import { SpecificationSections } from "@/components/specifications/SpecificationSections";

const SpecificationDetail = () => {
  const { specId } = useParams();
  const navigate = useNavigate();

  const { data: specification, isLoading } = useQuery({
    queryKey: ["specification", specId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_specifications")
        .select("*")
        .eq("id", specId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!specId,
  });

  if (isLoading) {
    return <div>Loading specification...</div>;
  }

  if (!specification) {
    return <div>Specification not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/specifications")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{specification.title}</h1>
          <p className="text-muted-foreground">
            {specification.spec_type} - {specification.spec_number} ({specification.revision})
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="terms">Terms & Abbreviations</TabsTrigger>
          <TabsTrigger value="sections">Sections & Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SpecificationOverview specification={specification} />
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <SpecificationTerms specId={specId!} />
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <SpecificationSections specId={specId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpecificationDetail;
