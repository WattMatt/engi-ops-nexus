import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Plus, Check, Clock, XCircle, DollarSign, Mail, Sparkles, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface Prize {
  id: string;
  winner_id: string | null;
  user_id: string;
  prize_type: string;
  prize_description: string;
  prize_value: number | null;
  status: "pending" | "awarded" | "claimed" | "expired";
  awarded_by: string | null;
  awarded_at: string | null;
  claimed_at: string | null;
  notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface PrizeProposal {
  id: string;
  name: string;
  description: string | null;
  prize_type: string;
  default_value: number | null;
  icon: string;
  is_enabled: boolean;
  display_order: number;
  created_at: string;
}

const PRIZE_TYPES = [
  { value: "voucher", label: "Voucher", icon: "🎫" },
  { value: "leave_hours", label: "Leave Hours", icon: "🏖️" },
  { value: "team_lunch", label: "Team Lunch", icon: "🍕" },
  { value: "company_swag", label: "Company Swag", icon: "👕" },
  { value: "other", label: "Other", icon: "🎁" },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  awarded: { label: "Awarded", color: "bg-blue-100 text-blue-800", icon: Gift },
  claimed: { label: "Claimed", color: "bg-green-100 text-green-800", icon: Check },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

export function PrizeTracking() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddProposalOpen, setIsAddProposalOpen] = useState(false);
  const [newPrize, setNewPrize] = useState({
    user_id: "",
    prize_type: "voucher",
    prize_description: "",
    prize_value: "",
    notes: "",
  });
  const [newProposal, setNewProposal] = useState({
    name: "",
    description: "",
    prize_type: "voucher",
    default_value: "",
    icon: "🎁",
  });

  // Fetch prize proposals
  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ["gamification-prize-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_prize_proposals")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PrizeProposal[];
    },
  });

  const { data: prizes, isLoading } = useQuery({
    queryKey: ["gamification-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_prizes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (data || []).map((prize) => ({
        ...prize,
        profile: profileMap.get(prize.user_id),
      })) as Prize[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["all-users-for-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Toggle proposal enabled status
  const toggleProposal = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("gamification_prize_proposals")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-prize-proposals"] });
      toast.success("Prize proposal updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Add new proposal
  const addProposal = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const maxOrder = proposals?.reduce((max, p) => Math.max(max, p.display_order), 0) || 0;

      const { error } = await supabase.from("gamification_prize_proposals").insert({
        name: newProposal.name,
        description: newProposal.description || null,
        prize_type: newProposal.prize_type,
        default_value: newProposal.default_value ? parseFloat(newProposal.default_value) : null,
        icon: newProposal.icon,
        is_enabled: true,
        display_order: maxOrder + 1,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-prize-proposals"] });
      toast.success("Prize proposal added!");
      setIsAddProposalOpen(false);
      setNewProposal({ name: "", description: "", prize_type: "voucher", default_value: "", icon: "🎁" });
    },
    onError: (error: any) => {
      toast.error("Failed to add proposal: " + error.message);
    },
  });

  // Delete proposal
  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gamification_prize_proposals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-prize-proposals"] });
      toast.success("Proposal deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const addPrize = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("gamification_prizes").insert({
        user_id: newPrize.user_id,
        prize_type: newPrize.prize_type,
        prize_description: newPrize.prize_description,
        prize_value: newPrize.prize_value ? parseFloat(newPrize.prize_value) : null,
        notes: newPrize.notes || null,
        awarded_by: user?.id,
        awarded_at: new Date().toISOString(),
        status: "awarded",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-prizes"] });
      toast.success("Prize added successfully!");
      setIsAddDialogOpen(false);
      setNewPrize({
        user_id: "",
        prize_type: "voucher",
        prize_description: "",
        prize_value: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to add prize: " + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ prizeId, status }: { prizeId: string; status: string }) => {
      const updates: any = { status };
      if (status === "claimed") {
        updates.claimed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("gamification_prizes")
        .update(updates)
        .eq("id", prizeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-prizes"] });
      toast.success("Prize status updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  // Calculate summary stats
  const stats = {
    total: prizes?.length || 0,
    pending: prizes?.filter((p) => p.status === "pending").length || 0,
    awarded: prizes?.filter((p) => p.status === "awarded").length || 0,
    claimed: prizes?.filter((p) => p.status === "claimed").length || 0,
    totalValue: prizes?.reduce((sum, p) => sum + (p.prize_value || 0), 0) || 0,
  };

  const enabledProposals = proposals?.filter(p => p.is_enabled) || [];

  if (isLoading || proposalsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prizes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.claimed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Prize Proposals Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Prize Proposals
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              Enabled prizes will appear in winner announcement emails
            </CardDescription>
          </div>
          <Dialog open={isAddProposalOpen} onOpenChange={setIsAddProposalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Proposal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Prize Proposal</DialogTitle>
                <DialogDescription>
                  Create a new prize option for winner emails
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-[60px_1fr] gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Input
                      value={newProposal.icon}
                      onChange={(e) => setNewProposal({ ...newProposal, icon: e.target.value })}
                      className="text-center text-xl"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g., R500 Takealot Voucher"
                      value={newProposal.name}
                      onChange={(e) => setNewProposal({ ...newProposal, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Short description for the email"
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newProposal.prize_type}
                      onValueChange={(v) => setNewProposal({ ...newProposal, prize_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIZE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Value (R)</Label>
                    <Input
                      type="number"
                      placeholder="500"
                      value={newProposal.default_value}
                      onChange={(e) => setNewProposal({ ...newProposal, default_value: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addProposal.mutate()}
                  disabled={!newProposal.name || addProposal.isPending}
                >
                  Add Proposal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proposals?.map((proposal) => (
              <div
                key={proposal.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  proposal.is_enabled ? "bg-green-50 border-green-200" : "bg-muted/50 border-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{proposal.icon}</span>
                  <div>
                    <p className="font-medium">{proposal.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {proposal.description && <span>{proposal.description}</span>}
                      {proposal.default_value && (
                        <Badge variant="secondary">R{proposal.default_value}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {proposal.is_enabled ? "In emails" : "Disabled"}
                    </span>
                    <Switch
                      checked={proposal.is_enabled}
                      onCheckedChange={(checked) => 
                        toggleProposal.mutate({ id: proposal.id, is_enabled: checked })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this prize proposal?")) {
                        deleteProposal.mutate(proposal.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(!proposals || proposals.length === 0) && (
              <p className="text-center py-8 text-muted-foreground">
                No prize proposals yet. Add some to include in winner emails.
              </p>
            )}
          </div>
          {enabledProposals.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>{enabledProposals.length}</strong> prize option{enabledProposals.length !== 1 ? 's' : ''} will appear in winner announcement emails
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prize Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Prize Log
            </CardTitle>
            <CardDescription>Track all prizes awarded to winners</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Award Prize
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award a Prize</DialogTitle>
                <DialogDescription>
                  Record a new prize for a team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <Select
                    value={newPrize.user_id}
                    onValueChange={(v) => setNewPrize({ ...newPrize, user_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prize Type</Label>
                  <Select
                    value={newPrize.prize_type}
                    onValueChange={(v) => setNewPrize({ ...newPrize, prize_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIZE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., R500 Takealot Voucher"
                    value={newPrize.prize_description}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value (R)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={newPrize.prize_value}
                    onChange={(e) => setNewPrize({ ...newPrize, prize_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={newPrize.notes}
                    onChange={(e) => setNewPrize({ ...newPrize, notes: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addPrize.mutate()}
                  disabled={!newPrize.user_id || !newPrize.prize_description}
                >
                  Award Prize
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Awarded</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prizes?.map((prize) => {
                const statusConfig = STATUS_CONFIG[prize.status];
                const prizeType = PRIZE_TYPES.find((t) => t.value === prize.prize_type);
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={prize.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{prize.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{prize.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{prize.prize_description}</p>
                      {prize.notes && (
                        <p className="text-xs text-muted-foreground">{prize.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{prizeType?.icon} {prizeType?.label}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {prize.prize_value ? `R${prize.prize_value.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {prize.awarded_at ? format(new Date(prize.awarded_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {prize.status === "awarded" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ prizeId: prize.id, status: "claimed" })}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Claimed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!prizes || prizes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No prizes recorded yet. Click "Award Prize" to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
