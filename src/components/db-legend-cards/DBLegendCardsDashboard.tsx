import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Check, X, Search, CircuitBoard, History, ChevronDown, ChevronRight } from "lucide-react";
import { LegendCardReportHistory } from "./LegendCardReportHistory";
import { LegendCardDetailViewer } from "./LegendCardDetailViewer";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  fed_from: string | null;
  feeding_breaker_id: string | null;
  feeding_system_info: string | null;
  circuits: any[];
  contactors: any[];
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
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [historyCard, setHistoryCard] = useState<LegendCard | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // For single-card review
  const [reviewCard, setReviewCard] = useState<LegendCard | null>(null);
  // For batch review
  const [batchAction, setBatchAction] = useState<"approve" | "reject" | null>(null);
  // PDF size chooser
  const [pdfSizeCard, setPdfSizeCard] = useState<LegendCard | null>(null);

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

  const { data: project } = useQuery({
    queryKey: ["project-name", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      return data;
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

  const submittedFiltered = filteredCards.filter((c) => c.status === "submitted");

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submittedFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submittedFiltered.map((c) => c.id)));
    }
  };

  const sendNotification = async (card: LegendCard, action: "approved" | "rejected", notes: string) => {
    if (!card.submitted_by_email) return;
    try {
      await supabase.functions.invoke("send-legend-card-notification", {
        body: {
          recipientEmail: card.submitted_by_email,
          recipientName: card.submitted_by_name || "Contractor",
          dbName: card.db_name,
          projectName: project?.name || "",
          action,
          reviewerNotes: notes || undefined,
        },
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const handleReview = async (action: "approve" | "reject") => {
    if (!reviewCard) return;
    setProcessing(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("db_legend_cards" as any)
        .update({ status: newStatus, reviewer_notes: reviewNotes || null } as any)
        .eq("id", reviewCard.id);
      if (error) throw error;

      // Send email notification
      await sendNotification(reviewCard, newStatus as "approved" | "rejected", reviewNotes);

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

  const handleBatchReview = async (action: "approve" | "reject") => {
    setProcessing(true);
    const newStatus = action === "approve" ? "approved" : "rejected";
    const targetCards = cards.filter((c) => selectedIds.has(c.id) && c.status === "submitted");
    let successCount = 0;

    try {
      for (const card of targetCards) {
        const { error } = await supabase
          .from("db_legend_cards" as any)
          .update({ status: newStatus, reviewer_notes: reviewNotes || null } as any)
          .eq("id", card.id);
        if (error) {
          console.error(`Failed to update ${card.db_name}:`, error);
          continue;
        }
        successCount++;
        // Stagger email sends (500ms delay) to respect Resend rate limits
        await sendNotification(card, newStatus as "approved" | "rejected", reviewNotes);
        if (targetCards.indexOf(card) < targetCards.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      toast.success(`${successCount} card(s) ${action === "approve" ? "approved" : "rejected"}`);
      setSelectedIds(new Set());
      setBatchAction(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["db-legend-cards-dashboard"] });
    } catch (err: any) {
      toast.error("Batch action failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = async (card: LegendCard, pageSize: "A4" | "A5" = "A4") => {
    setPdfSizeCard(null);
    setGeneratingPdf(card.id);
    try {
      const sizeLabel = pageSize === "A5" ? "_A5" : "";
      const filename = `${card.db_name.replace(/[^a-zA-Z0-9._-]/g, "_")}${sizeLabel}_Legend_Card.pdf`;
      const { data, error } = await supabase.functions.invoke("generate-legend-card-pdf", {
        body: { cardId: card.id, filename, pageSize },
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
      toast.success(`PDF downloaded (${pageSize})`);
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

      {/* Filters + Batch Actions */}
      <div className="flex flex-wrap gap-3 items-center">
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

        {selectedIds.size > 0 && (
          <div className="flex gap-2 items-center ml-auto">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="default" onClick={() => { setBatchAction("approve"); setReviewNotes(""); }}>
              <Check className="h-4 w-4 mr-1" /> Approve All
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { setBatchAction("reject"); setReviewNotes(""); }}>
              <X className="h-4 w-4 mr-1" /> Reject All
            </Button>
          </div>
        )}
      </div>

      {/* Select All for submitted */}
      {submittedFiltered.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === submittedFiltered.length && submittedFiltered.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-xs text-muted-foreground">Select all submitted ({submittedFiltered.length})</span>
        </div>
      )}

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
            const isExpanded = expandedCards.has(card.id);

            return (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(card.id)}>
                    <div className="flex items-center gap-3">
                      {/* Checkbox for submitted cards */}
                      {card.status === "submitted" && (
                        <Checkbox
                          checked={selectedIds.has(card.id)}
                          onCheckedChange={() => toggleSelect(card.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Expand trigger */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold">{card.db_name}</span>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {tenant && <span>{tenant.shop_number} — {tenant.shop_name}</span>}
                          {card.section_name && <span>Section: {card.section_name}</span>}
                          <span>{circuitCount} circuits</span>
                          {card.submitted_by_name && <span>By: {card.submitted_by_name}</span>}
                          {card.submitted_at && <span>Submitted: {format(new Date(card.submitted_at), "dd MMM yyyy")}</span>}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => setHistoryCard(card)} title="Report history">
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPdfSizeCard(card)}
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

                    <CollapsibleContent>
                      <LegendCardDetailViewer card={card} />
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Single Review Dialog */}
      <Dialog open={!!reviewCard && !!reviewAction} onOpenChange={() => { setReviewCard(null); setReviewAction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Legend Card
            </DialogTitle>
            <DialogDescription>
              {reviewCard?.db_name} — {reviewCard?.tenant_id ? tenantMap.get(reviewCard.tenant_id)?.shop_number : ""}
              {reviewCard?.submitted_by_email && (
                <span className="block text-xs mt-1">
                  Notification will be sent to {reviewCard.submitted_by_email}
                </span>
              )}
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

      {/* Batch Review Dialog */}
      <Dialog open={!!batchAction} onOpenChange={() => setBatchAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Batch {batchAction === "approve" ? "Approve" : "Reject"} — {selectedIds.size} Card(s)
            </DialogTitle>
            <DialogDescription>
              This will {batchAction} all selected submitted cards and send email notifications to each contractor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Notes {batchAction === "reject" ? "(required)" : "(optional)"}</Label>
              <Textarea
                placeholder={batchAction === "reject" ? "Please explain why these cards are being rejected..." : "Optional notes applied to all..."}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAction(null)}>Cancel</Button>
            <Button
              variant={batchAction === "approve" ? "default" : "destructive"}
              onClick={() => batchAction && handleBatchReview(batchAction)}
              disabled={processing || (batchAction === "reject" && !reviewNotes.trim())}
            >
              {processing ? "Processing..." : `${batchAction === "approve" ? "Approve" : "Reject"} ${selectedIds.size} Card(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {historyCard && (
        <LegendCardReportHistory
          cardId={historyCard.id}
          cardName={historyCard.db_name}
          open={!!historyCard}
          onOpenChange={(open) => !open && setHistoryCard(null)}
        />
      )}

      {/* PDF Size Chooser Dialog */}
      <Dialog open={!!pdfSizeCard} onOpenChange={() => setPdfSizeCard(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose PDF Size</DialogTitle>
            <DialogDescription>
              {pdfSizeCard?.db_name} — {Array.isArray(pdfSizeCard?.circuits) ? pdfSizeCard.circuits.length : 0} circuits
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => pdfSizeCard && handleDownloadPdf(pdfSizeCard, "A4")}
            >
              <span className="text-lg font-bold">A4</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Full size — all circuits</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => pdfSizeCard && handleDownloadPdf(pdfSizeCard, "A5")}
            >
              <span className="text-lg font-bold">A5</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Compact — max 50 circuits (1-25 / 26-50)</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
