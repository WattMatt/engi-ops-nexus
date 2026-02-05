import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { BudgetOverview } from "@/components/budgets/BudgetOverview";
import { BudgetSectionsManager } from "@/components/budgets/BudgetSectionsManager";
import { BudgetPdfUpload } from "@/components/budgets/BudgetPdfUpload";
import { BudgetExtractionReview } from "@/components/budgets/BudgetExtractionReview";
import { AreaScheduleSync } from "@/components/budgets/AreaScheduleSync";
import { BudgetReferenceDrawings } from "@/components/budgets/BudgetReferenceDrawings";
import { BudgetBaselineAllowances } from "@/components/budgets/BudgetBaselineAllowances";
import { BudgetExclusions } from "@/components/budgets/BudgetExclusions";
import { ElectricalBudgetExportPDFButton } from "@/components/budgets/ElectricalBudgetExportPDFButton";
import { ElectricalBudgetReportHistory } from "@/components/budgets/ElectricalBudgetReportHistory";
import { OfflineSyncStatusBar } from "@/components/pwa/OfflineSyncStatusBar";
import { useBudgetOfflineSync } from "@/hooks/useBudgetOfflineSync";

interface ExtractedData {
  budget_number: string;
  revision: string;
  budget_date: string;
  prepared_for_company: string | null;
  prepared_for_contact: string | null;
  sections: Array<{
    section_code: string;
    section_name: string;
    display_order: number;
    line_items: Array<{
      item_number: string;
      description: string;
      area: number | null;
      area_unit: string;
      base_rate: number | null;
      ti_rate: number | null;
      total: number;
      shop_number: string | null;
      is_tenant_item: boolean;
    }>;
  }>;
  area_schedule: Array<{
    shop_number: string;
    tenant_name: string;
    area: number;
    area_unit: string;
    base_rate: number | null;
    ti_rate: number | null;
    total: number | null;
    category: string;
  }>;
}

const ElectricalBudgetDetail = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const { data: budget, isLoading, refetch } = useQuery({
    queryKey: ["electrical-budget", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("id", budgetId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });
  
  // Offline sync hook
  const {
    unsyncedCount,
    isOnline,
    syncNow,
  } = useBudgetOfflineSync({ budgetId: budgetId || '', enabled: !!budgetId });
  
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      setLastSyncAt(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, [syncNow]);

  const handleExtractionComplete = (data: ExtractedData) => {
    setExtractedData(data);
    setShowReview(true);
  };

  const handleSaveComplete = () => {
    setShowReview(false);
    setExtractedData(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["budget-sections", budgetId] });
    setActiveTab("sections");
  };

  const handleCancelReview = () => {
    setShowReview(false);
    setExtractedData(null);
  };

  const handleSyncComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["tenants"] });
  };

  if (isLoading) {
    return <div className="p-6">Loading budget...</div>;
  }

  if (!budget) {
    return <div className="p-6">Budget not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/budgets/electrical")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Budget #{budget.budget_number} - {budget.revision}
            </h1>
            <p className="text-muted-foreground">
              {new Date(budget.budget_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ElectricalBudgetExportPDFButton budgetId={budgetId!} />
      </div>
      
      {/* Offline Sync Status */}
      <OfflineSyncStatusBar
        pendingCount={unsyncedCount}
        isSyncing={isSyncing}
        onSync={handleSync}
        lastSyncAt={lastSyncAt}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Sections & Items</TabsTrigger>
          <TabsTrigger value="allowances">Baseline Allowances</TabsTrigger>
          <TabsTrigger value="exclusions">Exclusions</TabsTrigger>
          <TabsTrigger value="drawings">Reference Drawings</TabsTrigger>
          <TabsTrigger value="reports">Report History</TabsTrigger>
          <TabsTrigger value="import">Import from PDF</TabsTrigger>
          {extractedData?.area_schedule && extractedData.area_schedule.length > 0 && (
            <TabsTrigger value="area-sync">Area Schedule Sync</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BudgetOverview budget={budget} />
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <BudgetSectionsManager budgetId={budgetId!} />
        </TabsContent>

        <TabsContent value="allowances" className="mt-4">
          <BudgetBaselineAllowances 
            budgetId={budgetId!} 
            initialValue={budget.baseline_allowances}
            onUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="exclusions" className="mt-4">
          <BudgetExclusions 
            budgetId={budgetId!} 
            initialValue={budget.exclusions}
            onUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="drawings" className="mt-4">
          <BudgetReferenceDrawings budgetId={budgetId!} projectId={budget.project_id} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ElectricalBudgetReportHistory budgetId={budgetId!} />
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-4">
          {showReview && extractedData ? (
            <BudgetExtractionReview
              budgetId={budgetId!}
              extractedData={extractedData}
              onSave={handleSaveComplete}
              onCancel={handleCancelReview}
            />
          ) : (
            <BudgetPdfUpload
              budgetId={budgetId!}
              projectId={budget.project_id}
              onExtractionComplete={handleExtractionComplete}
            />
          )}
        </TabsContent>

        {extractedData?.area_schedule && extractedData.area_schedule.length > 0 && (
          <TabsContent value="area-sync" className="mt-4">
            <AreaScheduleSync
              projectId={budget.project_id}
              areaSchedule={extractedData.area_schedule}
              onSyncComplete={handleSyncComplete}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ElectricalBudgetDetail;
