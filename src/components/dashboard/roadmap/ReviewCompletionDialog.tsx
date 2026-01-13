import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Send, Users, Loader2, Plus, X, Mail } from "lucide-react";
import { toast } from "sonner";

interface ItemUpdate {
  itemId: string;
  title: string;
  wasCompleted: boolean;
  isNowCompleted: boolean;
  notes?: string;
}

interface Recipient {
  email: string;
  name: string;
  source: "team" | "contact" | "custom";
}

interface ReviewCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  reviewSessionId: string;
  itemUpdates: ItemUpdate[];
  onComplete: () => void;
}

export function ReviewCompletionDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  reviewSessionId,
  itemUpdates,
  onComplete,
}: ReviewCompletionDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");

  // Fetch project team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["project-team-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || [])
        .filter((m: any) => m.profiles?.email)
        .map((m: any) => ({
          email: m.profiles.email,
          name: m.profiles.full_name || m.profiles.email,
          role: m.role,
          source: "team" as const,
        }));
    },
    enabled: open,
  });

  // Fetch project contacts
  const { data: projectContacts = [] } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("id, contact_person_name, email, organization_name, contact_type")
        .eq("project_id", projectId)
        .not("email", "is", null);
      if (error) throw error;
      return (data || [])
        .filter((c: any) => c.email)
        .map((c: any) => ({
          email: c.email,
          name: c.contact_person_name || c.organization_name || c.email,
          organization: c.organization_name,
          type: c.contact_type,
          source: "contact" as const,
        }));
    },
    enabled: open,
  });

  const toggleRecipient = (recipient: Recipient) => {
    const exists = selectedRecipients.find(r => r.email === recipient.email);
    if (exists) {
      setSelectedRecipients(prev => prev.filter(r => r.email !== recipient.email));
    } else {
      setSelectedRecipients(prev => [...prev, recipient]);
    }
  };

  const addCustomRecipient = () => {
    if (!customEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (selectedRecipients.find(r => r.email === customEmail.trim())) {
      toast.error("This email is already added");
      return;
    }

    setSelectedRecipients(prev => [
      ...prev,
      {
        email: customEmail.trim(),
        name: customName.trim() || customEmail.trim(),
        source: "custom" as const,
      },
    ]);
    setCustomEmail("");
    setCustomName("");
  };

  const removeRecipient = (email: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.email !== email));
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("send-roadmap-review-update", {
        body: {
          projectId,
          reviewSessionId,
          message: message || undefined,
          itemUpdates,
          recipients: selectedRecipients.map(r => ({ email: r.email, name: r.name })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send update");
      }

      toast.success(response.data.message || "Review update sent successfully!");
      setSelectedRecipients([]);
      setMessage("");
      onComplete();
    } catch (error: any) {
      console.error("Error sending review update:", error);
      toast.error(error.message || "Failed to send review update");
    } finally {
      setIsSending(false);
    }
  };

  const completedItems = itemUpdates.filter(u => !u.wasCompleted && u.isNowCompleted);
  const uncheckedItems = itemUpdates.filter(u => u.wasCompleted && !u.isNowCompleted);

  const isRecipientSelected = (email: string) => 
    selectedRecipients.some(r => r.email === email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Complete Review & Send Update</DialogTitle>
          <DialogDescription>
            Select recipients and send a consolidated update about your roadmap changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{completedItems.length}</p>
                <p className="text-xs text-muted-foreground">Items completed</p>
              </div>
            </div>
            {uncheckedItems.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{uncheckedItems.length}</p>
                  <p className="text-xs text-muted-foreground">Items unchecked</p>
                </div>
              </div>
            )}
          </div>

          {/* Updated Items List */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Updated Items ({itemUpdates.length})
            </Label>
            <ScrollArea className="h-24 rounded-md border">
              <div className="p-3 space-y-2">
                {itemUpdates.map((update) => (
                  <div key={update.itemId} className="flex items-center gap-2">
                    {update.isNowCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate">{update.title}</span>
                    {update.notes && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Has notes
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Recipients Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Select Recipients</Label>
            </div>

            {/* Team Members */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Project Team</p>
                <div className="grid grid-cols-2 gap-2">
                  {teamMembers.map((member: any) => (
                    <label
                      key={member.email}
                      className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={isRecipientSelected(member.email)}
                        onCheckedChange={() => toggleRecipient(member)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      {member.role && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {member.role}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Project Contacts */}
            {projectContacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Project Contacts</p>
                <div className="grid grid-cols-2 gap-2">
                  {projectContacts.map((contact: any) => (
                    <label
                      key={contact.email}
                      className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={isRecipientSelected(contact.email)}
                        onCheckedChange={() => toggleRecipient(contact)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      </div>
                      {contact.type && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {contact.type}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Email */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Add Custom Recipient</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Email address"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustomRecipient()}
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
            </div>

            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Selected Recipients ({selectedRecipients.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((recipient) => (
                    <Badge
                      key={recipient.email}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <Mail className="h-3 w-3" />
                      {recipient.name}
                      <button
                        onClick={() => removeRecipient(recipient.email)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Optional Message */}
          <div>
            <Label htmlFor="message" className="text-sm">
              Optional Message
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to include with the update..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || selectedRecipients.length === 0}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Update ({selectedRecipients.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
