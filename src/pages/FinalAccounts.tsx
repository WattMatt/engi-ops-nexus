import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { FinalAccountOverview } from "@/components/final-accounts/FinalAccountOverview";
import { FinalAccountBillsManager } from "@/components/final-accounts/FinalAccountBillsManager";
import { BOQDiscrepanciesSummary } from "@/components/final-accounts/BOQDiscrepanciesSummary";
import { PrimeCostManager } from "@/components/final-accounts/PrimeCostManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FinalAccounts = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const queryClient = useQueryClient();

  // Fetch existing final account for this project
  const { data: account, isLoading, refetch } = useQuery({
    queryKey: ["final-account", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_accounts")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch project details for auto-creation
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !account,
  });

  // Auto-create final account if it doesn't exist
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("final_accounts")
        .insert({
          project_id: projectId,
          account_number: `FA-${project?.project_number || Date.now()}`,
          account_name: project?.name || "Final Account",
          client_name: project?.client_name || null,
          status: "draft",
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Auto-create when project loads and no account exists
  useEffect(() => {
    if (!isLoading && !account && project && !createMutation.isPending) {
      createMutation.mutate();
    }
  }, [isLoading, account, project]);

  if (isLoading || createMutation.isPending) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Setting up final account...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Final Account</h2>
        <p className="text-muted-foreground">
          Track contract variations and reconcile final measured quantities
        </p>
      </div>

      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">Bills & Sections</TabsTrigger>
          <TabsTrigger value="prime-costs">Prime Costs</TabsTrigger>
          <TabsTrigger value="discrepancies">BOQ Discrepancies</TabsTrigger>
          <TabsTrigger value="overview">Account Details</TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="space-y-4">
          <FinalAccountBillsManager accountId={account.id} projectId={projectId || ""} />
        </TabsContent>
        <TabsContent value="prime-costs" className="space-y-4">
          <PrimeCostManager accountId={account.id} projectId={projectId || ""} />
        </TabsContent>
        <TabsContent value="discrepancies" className="space-y-4">
          <BOQDiscrepanciesSummary accountId={account.id} />
        </TabsContent>
        <TabsContent value="overview" className="space-y-4">
          <FinalAccountOverview account={account} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinalAccounts;
