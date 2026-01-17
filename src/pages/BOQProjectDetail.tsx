import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOQBillsManager } from "@/components/boq/BOQBillsManager";
import { BOQOverview } from "@/components/boq/BOQOverview";
import { LineShopTemplatesGrid } from "@/components/boq/LineShopTemplatesGrid";

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
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading BOQ details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projectId = boq.project_id;

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
        <div className="flex items-start gap-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/boqs")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {boq.boq_number} - {boq.boq_name}
            </h1>
            <p className="text-sm text-muted-foreground">{(boq as any).projects?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="bills" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bills">Bills & Sections</TabsTrigger>
            <TabsTrigger value="line-shop">Line Shop Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">
            {boq && <BOQOverview boq={boq} />}
          </TabsContent>
          <TabsContent value="bills" className="space-y-6">
            {boqId && projectId && <BOQBillsManager boqId={boqId} projectId={projectId} />}
          </TabsContent>
          <TabsContent value="line-shop" className="space-y-6">
            {boqId && projectId && <LineShopTemplatesGrid projectId={projectId} boqId={boqId} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BOQProjectDetail;

