import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Mail, FileDown, Loader2, Plus, X, Users } from "lucide-react";
import { generateSectionPDF, downloadSectionPDF } from "@/utils/sectionPdfExport";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SendForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  sectionName: string;
  accountId: string;
}

interface CustomRecipient {
  id: string;
  name: string;
  email: string;
}

export function SendForReviewDialog({
  open,
  onOpenChange,
  sectionId,
  sectionName,
  accountId
}: SendForReviewDialogProps) {
  const queryClient = useQueryClient();
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [newCustomEmail, setNewCustomEmail] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [message, setMessage] = useState("");
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

  const toggleContractor = (contractorId: string) => {
    setSelectedContractorIds(prev => 
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const addCustomRecipient = () => {
    if (!newCustomEmail || !newCustomName) {
      toast.error("Please enter both name and email");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check for duplicate
    if (customRecipients.some(r => r.email.toLowerCase() === newCustomEmail.toLowerCase())) {
      toast.error("This email has already been added");
      return;
    }

    setCustomRecipients(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: newCustomName, email: newCustomEmail }
    ]);
    setNewCustomEmail("");
    setNewCustomName("");
  };

  const removeCustomRecipient = (id: string) => {
    setCustomRecipients(prev => prev.filter(r => r.id !== id));
  };

  const getTotalRecipients = () => {
    return selectedContractorIds.length + customRecipients.length;
  };

  const sendForReviewMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build recipients list
      const recipients: Array<{ email: string; name: string; contactId?: string }> = [];
      
      // Add selected contractors
      selectedContractorIds.forEach(id => {
        const contractor = contractors?.find(c => c.id === id);
        if (contractor?.email) {
          recipients.push({
            email: contractor.email,
            name: contractor.contact_person_name || 'Contractor',
            contactId: contractor.id,
          });
        }
      });

      // Add custom recipients
      customRecipients.forEach(r => {
        recipients.push({ email: r.email, name: r.name });
      });

      if (recipients.length === 0) {
        throw new Error("Please select at least one recipient");
      }

      // Generate PDF for the section (once for all recipients)
      setIsGeneratingPdf(true);
      let pdfUrl: string | null = null;
      
      try {
        const pdfBlob = await generateSectionPDF(sectionId);
        const fileName = `section_review_${sectionId}_${Date.now()}.pdf`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("final-account-reviews")
          .upload(fileName, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error("PDF upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("final-account-reviews")
            .getPublicUrl(fileName);
          pdfUrl = urlData.publicUrl;
        }
      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
      } finally {
        setIsGeneratingPdf(false);
      }

      // Send to each recipient
      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          // Generate unique access token for each recipient
          const { data: tokenData, error: tokenError } = await supabase
            .rpc("generate_review_access_token");
          if (tokenError) throw tokenError;

          // Create review record
          const { data: review, error: reviewError } = await supabase
            .from("final_account_section_reviews")
            .insert({
              section_id: sectionId,
              reviewer_contact_id: recipient.contactId || null,
              reviewer_email: recipient.email,
              reviewer_name: recipient.name,
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

          // Send email notification
          const reviewUrl = `${window.location.origin}/review/${tokenData}`;
          
          await supabase.functions.invoke("send-section-review-email", {
            body: {
              to: recipient.email,
              reviewerName: recipient.name,
              sectionName,
              message,
              reviewUrl,
              pdfUrl,
            },
          });

          return review;
        })
      );

      // Update section status
      const { error: updateError } = await supabase
        .from("final_account_sections")
        .update({ review_status: "sent_for_review" })
        .eq("id", sectionId);

      if (updateError) throw updateError;

      // Check results
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { succeeded, failed, total: recipients.length };
    },
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(`Sent to ${result.succeeded} of ${result.total} recipients. ${result.failed} failed.`);
      } else {
        toast.success(`Review request sent to ${result.succeeded} recipient${result.succeeded > 1 ? 's' : ''}`);
      }
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
    setSelectedContractorIds([]);
    setCustomRecipients([]);
    setNewCustomEmail("");
    setNewCustomName("");
    setMessage("");
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
    if (getTotalRecipients() === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    sendForReviewMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Section for Review
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Section info */}
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

            {/* Recipients summary */}
            {getTotalRecipients() > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-2 rounded-md">
                <Users className="h-4 w-4" />
                <span>
                  Sending to <strong className="text-foreground">{getTotalRecipients()}</strong> recipient{getTotalRecipients() > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Contractor selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Contractors
              </Label>
              {contractors && contractors.length > 0 ? (
                <div className="border rounded-md p-2 space-y-1 max-h-[150px] overflow-y-auto">
                  {contractors.map((contractor) => (
                    <div
                      key={contractor.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => toggleContractor(contractor.id)}
                    >
                      <Checkbox
                        id={contractor.id}
                        checked={selectedContractorIds.includes(contractor.id)}
                        onCheckedChange={() => toggleContractor(contractor.id)}
                      />
                      <label
                        htmlFor={contractor.id}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <span className="font-medium">{contractor.contact_person_name}</span>
                        <span className="text-muted-foreground ml-2">({contractor.email})</span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                  No contractors found. Add contractors to the project or use custom emails below.
                </p>
              )}
            </div>

            {/* Custom emails section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Add Custom Recipients
              </Label>
              
              {/* Added custom recipients */}
              {customRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {customRecipients.map((recipient) => (
                    <Badge
                      key={recipient.id}
                      variant="secondary"
                      className="flex items-center gap-1 py-1"
                    >
                      <span className="max-w-[150px] truncate">{recipient.name}</span>
                      <span className="text-muted-foreground">({recipient.email})</span>
                      <button
                        type="button"
                        onClick={() => removeCustomRecipient(recipient.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add new custom recipient */}
              <div className="flex gap-2">
                <Input
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="Name"
                  className="flex-1"
                />
                <Input
                  type="email"
                  value={newCustomEmail}
                  onChange={(e) => setNewCustomEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomRecipient();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addCustomRecipient}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click + to add recipient
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message for the reviewers..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={sendForReviewMutation.isPending || getTotalRecipients() === 0}
          >
            <Mail className="h-4 w-4 mr-2" />
            {sendForReviewMutation.isPending 
              ? "Sending..." 
              : `Send to ${getTotalRecipients()} Recipient${getTotalRecipients() !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}