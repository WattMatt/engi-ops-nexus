import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOQBillsManager } from "@/components/boq/BOQBillsManager";
import { BOQOverview } from "@/components/boq/BOQOverview";

const BOQProjectDetail = () => {
  const { boqId } = useParams();
  const navigate = useNavigate();

  const { data: boq } = useQuery({
    queryKey: ["project-boq", boqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_boqs")
        .select("*, projects(name)")
        .eq("id", boqId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!boqId,
  });

  if (!boq) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const projectId = boq.project_id;

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/boqs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {boq.boq_number} - {boq.boq_name}
          </h2>
          <p className="text-muted-foreground">{(boq as any).projects?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills & Sections</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {boq && <BOQOverview boq={boq} />}
        </TabsContent>
        <TabsContent value="bills" className="space-y-4">
          {boqId && projectId && <BOQBillsManager boqId={boqId} projectId={projectId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BOQProjectDetail;

