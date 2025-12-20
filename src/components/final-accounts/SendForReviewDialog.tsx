import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Mail, FileDown, Loader2 } from "lucide-react";
import { generateSectionPDF, downloadSectionPDF } from "@/utils/sectionPdfExport";
interface SendForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  sectionName: string;
  accountId: string;
}

export function SendForReviewDialog({
  open,
  onOpenChange,
  sectionId,
  sectionName,
  accountId
}: SendForReviewDialogProps) {
  const queryClient = useQueryClient();
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [message, setMessage] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Fetch project ID from final account
  const { data: finalAccount } = useQuery({
    queryKey: ["final-account-project", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_accounts")
        .select("project_id")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch contractors from project contacts
  const { data: contractors } = useQuery({
    queryKey: ["project-contractors", finalAccount?.project_id],
    queryFn: async () => {
      if (!finalAccount?.project_id) return [];
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", finalAccount.project_id)
        .eq("contact_type", "contractor");
      if (error) throw error;
      return data || [];
    },
    enabled: !!finalAccount?.project_id,
  });

  const sendForReviewMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate PDF for the section
      setIsGeneratingPdf(true);
      let pdfUrl: string | null = null;
      
      try {
        const pdfBlob = await generateSectionPDF(sectionId);
        const fileName = `section_review_${sectionId}_${Date.now()}.pdf`;
        
        // Upload PDF to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("final-account-reviews")
          .upload(fileName, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error("PDF upload error:", uploadError);
          // Continue without PDF if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from("final-account-reviews")
            .getPublicUrl(fileName);
          pdfUrl = urlData.publicUrl;
        }
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        // Continue without PDF
      } finally {
        setIsGeneratingPdf(false);
      }

      // Generate access token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc("generate_review_access_token");
      if (tokenError) throw tokenError;

      const reviewerEmail = useCustom ? customEmail : contractors?.find(c => c.id === selectedContactId)?.email;
      const reviewerName = useCustom ? customName : contractors?.find(c => c.id === selectedContactId)?.contact_person_name;

      if (!reviewerEmail) throw new Error("Reviewer email is required");

      // Create review record
      const { data: review, error: reviewError } = await supabase
        .from("final_account_section_reviews")
        .insert({
          section_id: sectionId,
          reviewer_contact_id: useCustom ? null : selectedContactId,
          reviewer_email: reviewerEmail,
          reviewer_name: reviewerName,
          status: "sent_for_review",
          sent_at: new Date().toISOString(),
          sent_by: user.id,
          access_token: tokenData,
          message,
          pdf_url: pdfUrl,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Update section status
      const { error: updateError } = await supabase
        .from("final_account_sections")
        .update({ review_status: "sent_for_review" })
        .eq("id", sectionId);

      if (updateError) throw updateError;

      // Send email notification via edge function
      const reviewUrl = `${window.location.origin}/review/${tokenData}`;
      
      await supabase.functions.invoke("send-section-review-email", {
        body: {
          to: reviewerEmail,
          reviewerName,
          sectionName,
          message,
          reviewUrl,
          pdfUrl,
        },
      });

      return review;
    },
    onSuccess: () => {
      toast.success("Review request sent successfully");
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["section-reviews"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to send review request: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedContactId("");
    setCustomEmail("");
    setCustomName("");
    setMessage("");
    setUseCustom(false);
    setIsGeneratingPdf(false);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadSectionPDF(sectionId, sectionName);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmit = () => {
    if (!useCustom && !selectedContactId) {
      toast.error("Please select a contractor");
      return;
    }
    if (useCustom && (!customEmail || !customName)) {
      toast.error("Please enter reviewer name and email");
      return;
    }
    sendForReviewMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Section for Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-md flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Section:</p>
              <p className="font-medium">{sectionName}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="ml-2">Preview PDF</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Send to</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!useCustom ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustom(false)}
              >
                Select Contractor
              </Button>
              <Button
                type="button"
                variant={useCustom ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustom(true)}
              >
                Custom Email
              </Button>
            </div>
          </div>

          {!useCustom ? (
            <div className="space-y-2">
              <Label>Contractor</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors?.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.contact_person_name} ({contractor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contractors?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No contractors found. Add contractors to the project first or use custom email.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reviewer Name</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter reviewer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Reviewer Email</Label>
                <Input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for the reviewer..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={sendForReviewMutation.isPending}
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendForReviewMutation.isPending ? "Sending..." : "Send Review Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
