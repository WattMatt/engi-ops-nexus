import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Check, X, Eye, Search, CircuitBoard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DBLegendCardsDashboardProps {
  projectId: string;
}

interface LegendCard {
  id: string;
  tenant_id: string | null;
  db_name: string;
  status: string;
  submitted_at: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
  updated_at: string;
  address: string | null;
  coc_no: string | null;
  section_name: string | null;
  circuits: any[];
  reviewer_notes: string | null;
}

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Submitted", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function DBLegendCardsDashboard({ projectId }: DBLegendCardsDashboardProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewCard, setReviewCard] = useState<LegendCard | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["db-legend-cards-dashboard", projectId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("db_legend_cards" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LegendCard[];
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-lookup", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const filteredCards = cards.filter((card) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const tenant = card.tenant_id ? tenantMap.get(card.tenant_id) : null;
    return (
      card.db_name?.toLowerCase().includes(q) ||
      card.submitted_by_name?.toLowerCase().includes(q) ||
      tenant?.shop_name?.toLowerCase().includes(q) ||
      tenant?.shop_number?.toLowerCase().includes(q)
    );
  });

  const handleReview = async (action: "approve" | "reject") => {
    if (!reviewCard) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("db_legend_cards" as any)
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewer_notes: reviewNotes || null,
        } as any)
        .eq("id", reviewCard.id);
      if (error) throw error;
      toast.success(`Legend card ${action === "approve" ? "approved" : "rejected"}`);
      setReviewCard(null);
      setReviewNotes("");
      setReviewAction(null);
      queryClient.invalidateQueries({ queryKey: ["db-legend-cards-dashboard"] });
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = async (card: LegendCard) => {
    setGeneratingPdf(card.id);
    try {
      const filename = `${card.db_name.replace(/[^a-zA-Z0-9._-]/g, "_")}_Legend_Card.pdf`;
      const { data, error } = await supabase.functions.invoke("generate-legend-card-pdf", {
        body: { cardId: card.id, filename },
      });
      if (error) throw error;
      if (!data?.filePath) throw new Error("No file path returned");

      const { data: blob, error: dlError } = await supabase.storage
        .from("legend-card-reports")
        .download(data.filePath);
      if (dlError) throw dlError;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err: any) {
      toast.error("PDF generation failed: " + err.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Stats
  const submitted = cards.filter((c) => c.status === "submitted").length;
  const approved = cards.filter((c) => c.status === "approved").length;
  const rejected = cards.filter((c) => c.status === "rejected").length;
  const drafts = cards.filter((c) => c.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("submitted")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold text-primary">{submitted}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("approved")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-primary">{approved}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-destructive">{rejected}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("draft")}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold text-muted-foreground">{drafts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by board name, tenant, contractor..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards List */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading legend cards...</p>
      ) : filteredCards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CircuitBoard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No legend cards found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((card) => {
            const tenant = card.tenant_id ? tenantMap.get(card.tenant_id) : null;
            const cfg = statusConfig[card.status] || statusConfig.draft;
            const circuitCount = Array.isArray(card.circuits) ? card.circuits.length : 0;

            return (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{card.db_name}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {tenant && <span>{tenant.shop_number} — {tenant.shop_name}</span>}
                        {card.section_name && <span>Section: {card.section_name}</span>}
                        <span>{circuitCount} circuits</span>
                        {card.submitted_by_name && (
                          <span>By: {card.submitted_by_name}</span>
                        )}
                        {card.submitted_at && (
                          <span>Submitted: {format(new Date(card.submitted_at), "dd MMM yyyy")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPdf(card)}
                        disabled={generatingPdf === card.id}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {generatingPdf === card.id ? "..." : "PDF"}
                      </Button>
                      {card.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => { setReviewCard(card); setReviewAction("approve"); setReviewNotes(""); }}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setReviewCard(card); setReviewAction("reject"); setReviewNotes(""); }}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewCard && !!reviewAction} onOpenChange={() => { setReviewCard(null); setReviewAction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Legend Card
            </DialogTitle>
            <DialogDescription>
              {reviewCard?.db_name} — {reviewCard?.tenant_id ? tenantMap.get(reviewCard.tenant_id)?.shop_number : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Notes {reviewAction === "reject" ? "(required)" : "(optional)"}</Label>
              <Textarea
                placeholder={reviewAction === "reject" ? "Please explain why this card is being rejected..." : "Optional notes..."}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewCard(null); setReviewAction(null); }}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={() => reviewAction && handleReview(reviewAction)}
              disabled={processing || (reviewAction === "reject" && !reviewNotes.trim())}
            >
              {processing ? "Processing..." : reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
