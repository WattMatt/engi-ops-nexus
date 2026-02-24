import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, Calendar, Shield } from "lucide-react";

interface ShareGeneratorReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

const SHAREABLE_SECTIONS = [
  { id: "overview", label: "Overview & Summary", description: "Key metrics and project summary" },
  { id: "breakdown", label: "Tenant Breakdown", description: "Detailed tenant kW allocations" },
  { id: "zones", label: "Generator Zones", description: "Zone capacities and configurations" },
  { id: "costs", label: "Cost Summary", description: "Capital and running costs" },
  { id: "charts", label: "Charts & Visualizations", description: "Load distribution and cost charts" },
];

export function ShareGeneratorReportDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ShareGeneratorReportDialogProps) {
  const queryClient = useQueryClient();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>(["overview", "breakdown", "charts"]);
  const [expiryDays, setExpiryDays] = useState(7);

  // Fetch summary data for email
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-share", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open,
  });

  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["zone-generators-share", projectId],
    queryFn: async () => {
      if (!zones.length) return [];
      const zoneIds = zones.map((z) => z.id);
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zones.length > 0 && open,
  });

  const totalKva = zoneGenerators.reduce((sum, gen) => {
    const sizeStr = gen.generator_size || "";
    const match = sizeStr.match(/(\d+)\s*kva/i);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get sender profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const expiresAt = addDays(new Date(), expiryDays);

      // Create share record
      const { data: share, error: shareError } = await supabase
        .from("generator_report_shares")
        .insert({
          project_id: projectId,
          recipient_email: recipientEmail,
          recipient_name: recipientName || recipientEmail.split("@")[0],
          shared_by: user.id,
          message: message || null,
          shared_sections: selectedSections,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (shareError) throw shareError;

      // Send email via edge function
      const reportLink = `${window.location.origin}/generator-report/${share.token}`;
      
      await supabase.functions.invoke("send-generator-report-share", {
        body: {
          recipientEmail,
          recipientName: recipientName || recipientEmail.split("@")[0],
          senderName: profile?.full_name || user.email,
          projectName,
          message,
          totalKva,
          zoneCount: zones.length,
          reportLink,
          expiryDate: format(expiresAt, "MMMM d, yyyy"),
        },
      });

      return share;
    },
    onSuccess: () => {
      toast.success("Report shared successfully! Email sent to recipient.");
      queryClient.invalidateQueries({ queryKey: ["generator-report-shares"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to share report: ${error.message}`);
    },
  });

  const resetForm = () => {
    setRecipientEmail("");
    setRecipientName("");
    setMessage("");
    setSelectedSections(["overview", "breakdown", "charts"]);
    setExpiryDays(7);
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleShare = () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      toast.error("Please enter a valid email address (e.g. name@example.com)");
      return;
    }
    if (selectedSections.length === 0) {
      toast.error("Please select at least one section to share");
      return;
    }
    shareMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Share Generator Report
          </DialogTitle>
          <DialogDescription>
            Share this report with external clients via a secure, time-limited link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Recipient Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Client Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Optional Message</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message for the recipient..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Section Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sections to Share</Label>
            <div className="grid gap-2">
              {SHAREABLE_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedSections.includes(section.id)
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <Checkbox
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry Settings */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Link expires in</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={30}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Shield className="h-4 w-4 text-green-600 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-400">
              The recipient will receive a secure link. No login required. You can revoke access at any time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={shareMutation.isPending}>
            {shareMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Share Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
