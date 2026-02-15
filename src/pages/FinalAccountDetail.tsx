import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinalAccountOverview } from "@/components/final-accounts/FinalAccountOverview";
import { FinalAccountBillsManager } from "@/components/final-accounts/FinalAccountBillsManager";
import { PrimeCostManager } from "@/components/final-accounts/PrimeCostManager";
import { ReportHistoryPanel } from "@/components/shared/ReportHistoryPanel";

const FinalAccountDetail = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const { data: account } = useQuery({
    queryKey: ["final-account", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/final-accounts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {account?.account_number}
          </h2>
          <p className="text-muted-foreground">{account?.account_name}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Bills & Sections</TabsTrigger>
          <TabsTrigger value="prime-costs">Prime Costs</TabsTrigger>
          <TabsTrigger value="reports">Report History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {account && <FinalAccountOverview account={account} />}
        </TabsContent>
        <TabsContent value="bills" className="space-y-4">
          {accountId && account && <FinalAccountBillsManager accountId={accountId} projectId={account.project_id} />}
        </TabsContent>
        <TabsContent value="prime-costs" className="space-y-4">
          {accountId && account && <PrimeCostManager accountId={accountId} projectId={account.project_id} />}
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          {accountId && (
            <ReportHistoryPanel
              dbTable="final_account_reports"
              foreignKeyColumn="final_account_id"
              foreignKeyValue={accountId}
              storageBucket="final-account-reports"
              title="Final Account Reports"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinalAccountDetail;
