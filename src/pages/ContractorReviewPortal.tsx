import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCommentsPanel } from "@/components/final-accounts/SectionCommentsPanel";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, FileText, Building2 } from "lucide-react";

export default function ContractorReviewPortal() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const queryClient = useQueryClient();
  const [reviewerName, setReviewerName] = useState("");

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
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

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  };

  const getItemRate = (item: any) => (item.supply_rate || 0) + (item.install_rate || 0);
  const totalContractValue = items.reduce((sum, item) => sum + (item.contract_quantity || 0) * getItemRate(item), 0);
  const totalFinalValue = items.reduce((sum, item) => sum + (item.final_quantity || 0) * getItemRate(item), 0);
  const variance = totalFinalValue - totalContractValue;

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container max-w-5xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Section Review</CardTitle>
                <CardDescription>
                  {project?.name} - {finalAccount?.account_name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bill</p>
                <p className="font-medium">{bill?.bill_number} - {bill?.bill_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Section</p>
                <p className="font-medium">{section?.section_code} - {section?.section_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`font-medium ${
                  review.status === "approved" ? "text-green-600" :
                  review.status === "disputed" ? "text-destructive" :
                  "text-orange-600"
                }`}>
                  {review.status.replace("_", " ").toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reviewer</p>
                <p className="font-medium">{review.reviewer_name}</p>
              </div>
            </div>

            {review.message && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                <p className="text-sm text-muted-foreground">Message from sender:</p>
                <p className="text-sm">{review.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalContractValue)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Final Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalFinalValue)}</p>
              </div>
              <div className={`p-4 rounded-lg ${variance >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                <p className="text-sm text-muted-foreground">Variance</p>
                <p className={`text-xl font-bold ${variance >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Contract Qty</TableHead>
                    <TableHead className="text-right">Final Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Contract Value</TableHead>
                    <TableHead className="text-right">Final Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No items in this section
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const rate = getItemRate(item);
                      const contractValue = (item.contract_quantity || 0) * rate;
                      const finalValue = (item.final_quantity || 0) * rate;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="max-w-[300px]">{item.description}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">{item.contract_quantity}</TableCell>
                          <TableCell className="text-right">{item.final_quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(rate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contractValue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(finalValue)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <SectionCommentsPanel
          sectionId={review.section_id}
          reviewId={review.id}
          isContractor={true}
          contractorName={reviewerName}
        />

        {/* Actions */}
        {!isCompleted && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => updateStatusMutation.mutate("approved")}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Approve Section
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate("disputed")}
                  disabled={updateStatusMutation.isPending}
                >
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Raise Dispute
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Add comments above before approving or disputing this section.
              </p>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <Card className={review.status === "approved" ? "border-green-500" : "border-destructive"}>
            <CardContent className="pt-6 text-center">
              {review.status === "approved" ? (
                <div className="text-green-600">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">This section has been approved</p>
                </div>
              ) : (
                <div className="text-destructive">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">A dispute has been raised for this section</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
