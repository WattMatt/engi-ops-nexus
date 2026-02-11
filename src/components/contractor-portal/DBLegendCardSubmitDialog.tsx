import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface DBLegendCardSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  projectId: string;
  contractorName: string;
  contractorEmail: string;
  dbName: string;
  onSubmitted: () => void;
}

export function DBLegendCardSubmitDialog({
  open, onOpenChange, cardId, projectId, contractorName, contractorEmail, dbName, onSubmitted,
}: DBLegendCardSubmitDialogProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ["project-contacts-for-submit", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("id, contact_person_name, organization_name, email, contact_type")
        .eq("project_id", projectId)
        .order("contact_type");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!selectedContactId) {
      toast.error("Please select a contact to submit to");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("db_legend_cards" as any)
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by_name: contractorName,
          submitted_by_email: contractorEmail,
          submitted_to_contact_id: selectedContactId,
        } as any)
        .eq("id", cardId);
      if (error) throw error;

      // Fire notification edge function (fire-and-forget)
      const selectedContact = contacts.find((c) => c.id === selectedContactId);
      supabase.functions.invoke("send-legend-card-notification", {
        body: {
          card_id: cardId,
          project_id: projectId,
          db_name: dbName,
          contractor_name: contractorName,
          contractor_email: contractorEmail,
          recipient_email: selectedContact?.email,
          recipient_name: selectedContact?.contact_person_name || selectedContact?.organization_name,
        },
      }).catch(console.error);

      toast.success("Legend card submitted for review");
      onSubmitted();
    } catch (err: any) {
      toast.error("Failed to submit: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Legend Card</DialogTitle>
          <DialogDescription>
            Select the project contact to submit this DB legend card ({dbName}) to for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Submit To</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.contact_person_name || contact.organization_name}
                    {contact.email ? ` (${contact.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedContactId}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
