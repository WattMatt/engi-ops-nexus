import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCommentsPanel } from "@/components/final-accounts/SectionCommentsPanel";
import { ItemCommentsPanel } from "@/components/final-accounts/ItemCommentsPanel";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, FileText, Building2, Download, TrendingUp, TrendingDown, Minus, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

export default function ContractorReviewPortal() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");
  const [expandedItemComments, setExpandedItemComments] = useState<Set<string>>(new Set());

  const toggleItemComments = (itemId: string) => {
    setExpandedItemComments(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Validate token and fetch review data
  const { data: reviewData, isLoading, error } = useQuery({
    queryKey: ["contractor-review", accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error("Invalid access token");

      // Fetch review with section data
      const { data: review, error: reviewError } = await supabase
        .from("final_account_section_reviews")
        .select(`
          *,
          section:final_account_sections(
            *,
            bill:final_account_bills(
              *,
              final_account:final_accounts(
                *,
                project:projects(name)
              )
            )
          )
        `)
        .eq("access_token", accessToken)
        .single();

      if (reviewError) throw reviewError;
      if (!review) throw new Error("Review not found");

      setReviewerName(review.reviewer_name || "Contractor");

      // Fetch section items
      const { data: items, error: itemsError } = await supabase
        .from("final_account_items")
        .select("*")
        .eq("section_id", review.section_id)
        .order("display_order");

      if (itemsError) throw itemsError;

      // Update status to under_review if currently sent_for_review
      if (review.status === "sent_for_review") {
        await supabase
          .from("final_account_section_reviews")
          .update({ status: "under_review" })
          .eq("id", review.id);

        await supabase
          .from("final_account_sections")
          .update({ review_status: "under_review" })
          .eq("id", review.section_id);
      }

      return { review, items: items || [] };
    },
    enabled: !!accessToken,
  });

  // Fetch comment counts per item
  const { data: itemCommentCounts } = useQuery({
    queryKey: ["all-item-comments", reviewData?.review?.section_id],
    queryFn: async () => {
      if (!reviewData?.review?.section_id) return {};
      
      const { data, error } = await supabase
        .from("final_account_section_comments")
        .select("item_id")
        .eq("section_id", reviewData.review.section_id)
        .not("item_id", "is", null);
      
      if (error) throw error;
      
      // Count comments per item
      const counts: Record<string, number> = {};
      data?.forEach(comment => {
        if (comment.item_id) {
          counts[comment.item_id] = (counts[comment.item_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!reviewData?.review?.section_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: "approved" | "disputed") => {
      if (!reviewData?.review) throw new Error("No review data");

      const { error: reviewError } = await supabase
        .from("final_account_section_reviews")
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", reviewData.review.id);

      if (reviewError) throw reviewError;

      const { error: sectionError } = await supabase
        .from("final_account_sections")
        .update({ review_status: newStatus })
        .eq("id", reviewData.review.section_id);

      if (sectionError) throw sectionError;

      // Send notification via edge function
      await supabase.functions.invoke("send-review-status-notification", {
        body: {
          reviewId: reviewData.review.id,
          status: newStatus,
          reviewerName,
          sectionName: reviewData.review.section?.section_name,
        },
      });
    },
    onSuccess: (_, status) => {
      toast.success(status === "approved" ? "Section approved!" : "Dispute raised");
      queryClient.invalidateQueries({ queryKey: ["contractor-review", accessToken] });
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This review link is invalid or has expired. Please contact the sender for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { review, items } = reviewData;
  const section = review.section;
  const bill = section?.bill;
  const finalAccount = bill?.final_account;
  const project = finalAccount?.project;

  const isCompleted = review.status === "approved" || review.status === "disputed";

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString("en-ZA", { maximumFractionDigits: 2 });
  };

  // Use actual stored values from section
  const totalContractValue = section?.contract_total || 0;
  const totalFinalValue = section?.final_total || 0;
  const variance = section?.variation_total || 0;
  const variancePercent = totalContractValue > 0 ? (variance / totalContractValue) * 100 : 0;

  // Separate items into headers and measurable items
  const measurableItems = items.filter(item => item.unit && item.unit.trim() !== "");
  const allItems = items;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600">Approved</Badge>;
      case "disputed":
        return <Badge variant="destructive">Disputed</Badge>;
      case "under_review":
        return <Badge variant="secondary" className="bg-orange-500 text-white">Under Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Top Header Bar */}
      <div className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="w-full px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">Final Account Review Portal</h1>
                <p className="text-sm opacity-90">{project?.name}</p>
              </div>
            </div>
            {review.pdf_url && (
              <Button variant="secondary" size="sm" asChild>
                <a href={review.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8 space-y-6">
        {/* Section Info Card */}
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Account</p>
                <p className="font-semibold">{finalAccount?.account_number}</p>
                <p className="text-sm text-muted-foreground">{finalAccount?.account_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Bill</p>
                <p className="font-semibold">Bill {bill?.bill_number}</p>
                <p className="text-sm text-muted-foreground">{bill?.bill_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Section</p>
                <p className="font-semibold">{section?.section_code}</p>
                <p className="text-sm text-muted-foreground">{section?.section_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Reviewer</p>
                <p className="font-semibold">{review.reviewer_name}</p>
                <p className="text-sm text-muted-foreground">{review.reviewer_email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                <div className="mt-1">{getStatusBadge(review.status)}</div>
              </div>
            </div>

            {review.message && (
              <>
                <Separator className="my-6" />
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Message from Sender</p>
                  <p className="text-sm">{review.message}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Contract Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalContractValue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Final Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalFinalValue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-md ${variance >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Variation</p>
                  <p className={`text-2xl font-bold mt-1 ${variance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  variance > 0 ? 'bg-green-100 dark:bg-green-900/30' : 
                  variance < 0 ? 'bg-red-100 dark:bg-red-900/30' : 
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {variance > 0 ? <TrendingUp className="h-6 w-6 text-green-600" /> :
                   variance < 0 ? <TrendingDown className="h-6 w-6 text-destructive" /> :
                   <Minus className="h-6 w-6 text-muted-foreground" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Variance %</p>
                  <p className={`text-2xl font-bold mt-1 ${variancePercent >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(2)}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="text-amber-600 font-bold text-lg">%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Line Items ({allItems.length} items)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {measurableItems.length} measurable items
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] font-semibold"></TableHead>
                    <TableHead className="w-[80px] font-semibold">Item</TableHead>
                    <TableHead className="min-w-[300px] font-semibold">Description</TableHead>
                    <TableHead className="w-[80px] font-semibold">Unit</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Contract Qty</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Final Qty</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold">Supply Rate</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold">Install Rate</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold">Contract Amount</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold">Final Amount</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold">Variation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                        No items in this section
                      </TableCell>
                    </TableRow>
                  ) : (
                    allItems.map((item) => {
                      const isHeader = !item.unit || item.unit.trim() === "";
                      const itemVariation = (item.final_amount || 0) - (item.contract_amount || 0);
                      
                      if (isHeader) {
                        return (
                          <TableRow key={item.id} className="bg-muted/30 font-semibold">
                            <TableCell className="py-3"></TableCell>
                            <TableCell className="py-3">{item.item_code || ''}</TableCell>
                            <TableCell colSpan={9} className="py-3">{item.description}</TableCell>
                          </TableRow>
                        );
                      }

                      const commentCount = itemCommentCounts?.[item.id] || 0;
                      const isExpanded = expandedItemComments.has(item.id);
                      
                      return (
                        <>
                          <TableRow key={item.id} className={`hover:bg-muted/20 ${isExpanded ? 'bg-muted/10' : ''}`}>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 relative ${commentCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                                onClick={() => toggleItemComments(item.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                                {commentCount > 0 && (
                                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                                    {commentCount}
                                  </span>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{item.item_code || ''}</TableCell>
                            <TableCell className="max-w-[400px]">
                              <span className="line-clamp-2">{item.description}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(item.contract_quantity)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(item.final_quantity)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.supply_rate)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.install_rate)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.contract_amount)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.final_amount)}</TableCell>
                            <TableCell className={`text-right font-mono ${
                              itemVariation > 0 ? 'text-green-600' : 
                              itemVariation < 0 ? 'text-destructive' : ''
                            }`}>
                              {itemVariation !== 0 && (itemVariation > 0 ? '+' : '')}{formatCurrency(itemVariation)}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={11} className="p-0">
                                <div className="p-4 bg-muted/5 border-y">
                                  <div className="max-w-2xl">
                                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                                      <MessageSquare className="h-4 w-4" />
                                      Comments for {item.item_code}
                                    </div>
                                    <ItemCommentsPanel
                                      sectionId={review.section_id}
                                      itemId={item.id}
                                      reviewId={review.id}
                                      isContractor={true}
                                      contractorName={reviewerName}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
                {/* Footer Totals */}
                <tfoot className="bg-muted/50 border-t-2">
                  <TableRow className="font-bold">
                    <TableCell colSpan={8} className="text-right py-4">Section Totals:</TableCell>
                    <TableCell className="text-right font-mono py-4">{formatCurrency(totalContractValue)}</TableCell>
                    <TableCell className="text-right font-mono py-4">{formatCurrency(totalFinalValue)}</TableCell>
                    <TableCell className={`text-right font-mono py-4 ${
                      variance > 0 ? 'text-green-600' : variance < 0 ? 'text-destructive' : ''
                    }`}>
                      {variance !== 0 && (variance > 0 ? '+' : '')}{formatCurrency(variance)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle>Comments & Feedback</CardTitle>
            <CardDescription>Add your comments, questions, or concerns about this section</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <SectionCommentsPanel
              sectionId={review.section_id}
              reviewId={review.id}
              isContractor={true}
              contractorName={reviewerName}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        {!isCompleted && (
          <Card className="shadow-lg border-2">
            <CardContent className="pt-6 pb-8">
              <h3 className="text-lg font-semibold text-center mb-6">Review Decision</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 flex-1 h-14 text-lg"
                  onClick={() => updateStatusMutation.mutate("approved")}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Approve Section
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="flex-1 h-14 text-lg"
                  onClick={() => updateStatusMutation.mutate("disputed")}
                  disabled={updateStatusMutation.isPending}
                >
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  Raise Dispute
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Please add any comments above before approving or disputing this section.
              </p>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <Card className={`shadow-lg border-2 ${review.status === "approved" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-red-50 dark:bg-red-950/20"}`}>
            <CardContent className="pt-8 pb-8 text-center">
              {review.status === "approved" ? (
                <div className="text-green-600">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-2xl font-bold">Section Approved</p>
                  <p className="text-muted-foreground mt-2">Thank you for reviewing this section.</p>
                </div>
              ) : (
                <div className="text-destructive">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-2xl font-bold">Dispute Raised</p>
                  <p className="text-muted-foreground mt-2">The project team will review your concerns.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="bg-muted/50 border-t mt-12 py-6">
        <div className="container max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Final Account Review Portal • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
