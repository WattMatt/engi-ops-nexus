import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, ShieldCheck, ShieldAlert, AlertTriangle, Eye } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { COCValidationForm } from "@/components/compliance/COCValidationForm";

type ViewMode = "list" | "new" | "edit";

export default function COCValidation() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editId, setEditId] = useState<string | null>(null);
  const projectId = localStorage.getItem("selectedProjectId");
  const navigate = useNavigate();

  const { data: validations, isLoading, refetch } = useQuery({
    queryKey: ["coc-validations", projectId],
    queryFn: async () => {
      let query = supabase
        .from("coc_validations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleSaved = () => {
    setViewMode("list");
    setEditId(null);
    refetch();
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setViewMode("edit");
  };

  if (viewMode === "new" || viewMode === "edit") {
    return (
      <div className="flex-1 p-6 max-w-5xl mx-auto">
        <div className="mb-4">
          <Button variant="outline" onClick={() => { setViewMode("list"); setEditId(null); }}>
            ← Back to List
          </Button>
        </div>
        <COCValidationForm
          editId={viewMode === "edit" ? editId : null}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "VALID":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 gap-1"><ShieldCheck className="h-3 w-3" />Valid</Badge>;
      case "INVALID":
        return <Badge className="bg-destructive/10 text-destructive gap-1"><ShieldAlert className="h-3 w-3" />Invalid</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 gap-1"><AlertTriangle className="h-3 w-3" />Review</Badge>;
    }
  };

  const fraudBadge = (score: string) => {
    switch (score) {
      case "HIGH":
        return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">Medium Risk</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Low Risk</Badge>;
    }
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">COC Validation</h1>
          <p className="text-muted-foreground">
            Validate Certificates of Compliance per OHS Act 85/1993 &amp; SANS 10142-1:2024
          </p>
        </div>
        <Button onClick={() => setViewMode("new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Validation
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : !validations?.length ? (
        <EmptyState
          icon={ShieldCheck}
          title="No COC validations yet"
          description="Create your first Certificate of Compliance validation to ensure legal compliance"
          action={{ label: "New Validation", onClick: () => setViewMode("new") }}
        />
      ) : (
        <div className="grid gap-3">
          {validations.map((v: any) => (
            <Card
              key={v.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleEdit(v.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{v.coc_reference_number}</span>
                      {statusBadge(v.validation_status)}
                      {fraudBadge(v.fraud_risk_score)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>{v.installation_address || "No address"}</span>
                      <span>·</span>
                      <span>{v.registered_person_name}</span>
                      <span>·</span>
                      <span>{format(new Date(v.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
