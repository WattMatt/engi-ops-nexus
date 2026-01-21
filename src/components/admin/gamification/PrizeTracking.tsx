import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Plus, Check, Clock, XCircle, DollarSign } from "lucide-react";
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
  const [newPrize, setNewPrize] = useState({
    user_id: "",
    prize_type: "voucher",
    prize_description: "",
    prize_value: "",
    notes: "",
  });

  const { data: prizes, isLoading } = useQuery({
    queryKey: ["gamification-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_prizes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles
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

  if (isLoading) {
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
