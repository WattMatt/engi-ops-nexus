import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Calendar, MoreVertical, Copy, Trash2 } from "lucide-react";
import { CreateCostReportDialog } from "@/components/cost-reports/CreateCostReportDialog";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostReportOverview } from "@/components/cost-reports/CostReportOverview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { toast } from "sonner";

const CostReports = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = localStorage.getItem("selectedProjectId");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: number } | null>(null);

  const { data: reports = [], refetch } = useQuery({
    queryKey: ["cost-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_number", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const latestReport = reports[0];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cost report deleted");
      queryClient.invalidateQueries({ queryKey: ["cost-reports", projectId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete cost report"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      // 1. Fetch source report
      const { data: source, error: srcErr } = await supabase
        .from("cost_reports").select("*").eq("id", sourceId).single();
      if (srcErr) throw srcErr;

      // 2. Next report_number
      const { data: maxRow, error: maxErr } = await supabase
        .from("cost_reports")
        .select("report_number")
        .eq("project_id", source.project_id)
        .order("report_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const nextNumber = (maxRow?.report_number ?? 0) + 1;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // 3. Insert new report
      const { id: _id, report_number: _rn, created_at: _ca, updated_at: _ua, created_by: _cb, ...rest } = source as any;
      const { data: newReport, error: insErr } = await supabase
        .from("cost_reports")
        .insert({ ...rest, report_number: nextNumber, created_by: userId })
        .select()
        .single();
      if (insErr) throw insErr;

      try {
        // 4. Categories + line items
        const { data: cats, error: catErr } = await supabase
          .from("cost_categories").select("*").eq("cost_report_id", sourceId);
        if (catErr) throw catErr;

        const catIdMap = new Map<string, string>();
        if (cats && cats.length) {
          const catInserts = cats.map((c: any) => {
            const { id, cost_report_id, created_at, updated_at, ...r } = c;
            return { ...r, cost_report_id: newReport.id };
          });
          const { data: newCats, error: newCatErr } = await supabase
            .from("cost_categories").insert(catInserts).select();
          if (newCatErr) throw newCatErr;
          // Map by display_order + code to be safe
          cats.forEach((oldC: any) => {
            const match = newCats!.find(
              (nc: any) => nc.code === oldC.code && nc.display_order === oldC.display_order
            );
            if (match) catIdMap.set(oldC.id, match.id);
          });

          const oldCatIds = cats.map((c: any) => c.id);
          const { data: items, error: itemErr } = await supabase
            .from("cost_line_items").select("*").in("category_id", oldCatIds);
          if (itemErr) throw itemErr;
          if (items && items.length) {
            const itemInserts = items.map((it: any) => {
              const { id, category_id, created_at, updated_at, ...r } = it;
              return { ...r, category_id: catIdMap.get(category_id)! };
            }).filter((it: any) => it.category_id);
            if (itemInserts.length) {
              const { error: insItemErr } = await supabase
                .from("cost_line_items").insert(itemInserts);
              if (insItemErr) throw insItemErr;
            }
          }
        }

        // 5. Report details
        const { data: details, error: detErr } = await supabase
          .from("cost_report_details").select("*").eq("cost_report_id", sourceId);
        if (detErr) throw detErr;
        if (details && details.length) {
          const detInserts = details.map((d: any) => {
            const { id, cost_report_id, created_at, updated_at, ...r } = d;
            return { ...r, cost_report_id: newReport.id };
          });
          const { error: insDetErr } = await supabase
            .from("cost_report_details").insert(detInserts);
          if (insDetErr) throw insDetErr;
        }

        // 6. Variations + variation line items
        const { data: vars, error: varErr } = await supabase
          .from("cost_variations").select("*").eq("cost_report_id", sourceId);
        if (varErr) throw varErr;
        if (vars && vars.length) {
          const varInserts = vars.map((v: any) => {
            const { id, cost_report_id, created_at, updated_at, created_by, updated_by, ...r } = v;
            return { ...r, cost_report_id: newReport.id, created_by: userId };
          });
          const { data: newVars, error: insVarErr } = await supabase
            .from("cost_variations").insert(varInserts).select();
          if (insVarErr) throw insVarErr;

          const varIdMap = new Map<string, string>();
          vars.forEach((oldV: any) => {
            const match = newVars!.find(
              (nv: any) => nv.code === oldV.code && nv.display_order === oldV.display_order
            );
            if (match) varIdMap.set(oldV.id, match.id);
          });

          const oldVarIds = vars.map((v: any) => v.id);
          const { data: vItems, error: vItemErr } = await supabase
            .from("variation_line_items").select("*").in("variation_id", oldVarIds);
          if (vItemErr) throw vItemErr;
          if (vItems && vItems.length) {
            const vItemInserts = vItems.map((it: any) => {
              const { id, variation_id, created_at, updated_at, ...r } = it;
              return { ...r, variation_id: varIdMap.get(variation_id)! };
            }).filter((it: any) => it.variation_id);
            if (vItemInserts.length) {
              const { error: insVItemErr } = await supabase
                .from("variation_line_items").insert(vItemInserts);
              if (insVItemErr) throw insVItemErr;
            }
          }
        }

        return newReport;
      } catch (e) {
        // Rollback: cascade delete cleans children
        await supabase.from("cost_reports").delete().eq("id", newReport.id);
        throw e;
      }
    },
    onSuccess: (newReport) => {
      toast.success(`Cost Report #${newReport.report_number} created`);
      queryClient.invalidateQueries({ queryKey: ["cost-reports", projectId] });
      navigate(`/dashboard/cost-reports/${newReport.id}`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to duplicate cost report"),
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Cost Reports
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage project cost reports and track financial progress
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Cost Report
          </Button>
        </div>

      {reports.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">No cost reports yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Create your first cost report to track project finances and monitor budget performance
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Cost Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Project Overview</TabsTrigger>
            <TabsTrigger value="reports">All Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {latestReport && <CostReportOverview report={latestReport} />}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50"
                  onClick={() => navigate(`/dashboard/cost-reports/${report.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">
                      Cost Report #{report.report_number}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Report actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            disabled={duplicateMutation.isPending}
                            onSelect={(e) => {
                              e.preventDefault();
                              duplicateMutation.mutate(report.id);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteTarget({ id: report.id, number: report.report_number });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xl font-bold text-foreground">{report.project_name}</div>
                    <div className="space-y-1.5 pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(report.report_date), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Client: {report.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Project: {report.project_number}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <CreateCostReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId!}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget ? `Delete Cost Report #${deleteTarget.number}?` : "Delete Cost Report"}
        description="This permanently deletes the report along with all its categories, line items, variations, and generated PDFs. This action cannot be undone."
        loading={deleteMutation.isPending}
      />
      </div>
    </div>
  );
};

export default CostReports;
