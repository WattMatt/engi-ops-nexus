import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Trophy, Medal, Calendar, RefreshCw, Megaphone, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface Winner {
  id: string;
  user_id: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  total_completions: number;
  total_streak_days: number;
  rank: number;
  announced_at: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export function HallOfFame() {
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);

  const { data: winners, isLoading } = useQuery({
    queryKey: ["hall-of-fame-winners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_winners")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for winners
      const userIds = [...new Set(data?.map((w) => w.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (data || []).map((winner) => ({
        ...winner,
        profile: profileMap.get(winner.user_id),
      })) as Winner[];
    },
  });

  const calculateWinners = useMutation({
    mutationFn: async (periodType: "weekly" | "monthly") => {
      setCalculating(true);
      
      // Business owner email - excluded from winning
      const EXCLUDED_OWNER_EMAIL = "arno@wmeng.co.za";
      
      // Get streak data
      const { data: streaks, error: streakError } = await supabase
        .from("roadmap_completion_streaks")
        .select("*");

      if (streakError) throw streakError;

      // Get all profiles to filter by email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email");
      
      const profileMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      // Aggregate by user
      const userStats = new Map<string, { completions: number; streak: number; email: string }>();
      streaks?.forEach((s) => {
        const email = profileMap.get(s.user_id) || "";
        const existing = userStats.get(s.user_id) || { completions: 0, streak: 0, email };
        existing.completions += s.total_completions || 0;
        existing.streak = Math.max(existing.streak, s.current_streak || 0);
        userStats.set(s.user_id, existing);
      });

      // Sort, exclude business owner, and get top 3 eligible winners
      const sorted = Array.from(userStats.entries())
        .filter(([_, stats]) => stats.email.toLowerCase() !== EXCLUDED_OWNER_EMAIL.toLowerCase())
        .sort((a, b) => b[1].completions - a[1].completions)
        .slice(0, 3);

      // Calculate period dates
      const now = new Date();
      let periodStart: Date, periodEnd: Date;
      
      if (periodType === "weekly") {
        const lastWeek = subWeeks(now, 1);
        periodStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
        periodEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
      } else {
        const lastMonth = subMonths(now, 1);
        periodStart = startOfMonth(lastMonth);
        periodEnd = endOfMonth(lastMonth);
      }

      // Insert winners
      for (let i = 0; i < sorted.length; i++) {
        const [userId, stats] = sorted[i];
        await supabase.from("gamification_winners").upsert({
          user_id: userId,
          period_type: periodType,
          period_start: format(periodStart, "yyyy-MM-dd"),
          period_end: format(periodEnd, "yyyy-MM-dd"),
          total_completions: stats.completions,
          total_streak_days: stats.streak,
          rank: i + 1,
        }, {
          onConflict: "user_id,period_type,period_start",
        });
      }

      return sorted.length;
    },
    onSuccess: (count, periodType) => {
      queryClient.invalidateQueries({ queryKey: ["hall-of-fame-winners"] });
      toast.success(`Calculated ${count} ${periodType} winners`);
      setCalculating(false);
    },
    onError: (error: any) => {
      toast.error("Failed to calculate winners: " + error.message);
      setCalculating(false);
    },
  });

  const announceWinner = useMutation({
    mutationFn: async (winnerId: string) => {
      // Update announced_at
      const { error } = await supabase
        .from("gamification_winners")
        .update({ announced_at: new Date().toISOString() })
        .eq("id", winnerId);

      if (error) throw error;

      // TODO: Send announcement email via edge function
      return winnerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hall-of-fame-winners"] });
      toast.success("Winner announced!");
    },
    onError: (error: any) => {
      toast.error("Failed to announce winner: " + error.message);
    },
  });

  const weeklyWinners = winners?.filter((w) => w.period_type === "weekly") || [];
  const monthlyWinners = winners?.filter((w) => w.period_type === "monthly") || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: "🥇", color: "bg-amber-100 text-amber-800 border-amber-300" };
    if (rank === 2) return { icon: "🥈", color: "bg-gray-100 text-gray-800 border-gray-300" };
    if (rank === 3) return { icon: "🥉", color: "bg-orange-100 text-orange-800 border-orange-300" };
    return { icon: `#${rank}`, color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Calculate Winners
          </CardTitle>
          <CardDescription>
            Manually calculate and record winners for the previous period
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button 
            onClick={() => calculateWinners.mutate("weekly")}
            disabled={calculating}
          >
            {calculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
            Calculate Weekly Winners
          </Button>
          <Button 
            variant="secondary"
            onClick={() => calculateWinners.mutate("monthly")}
            disabled={calculating}
          >
            {calculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
            Calculate Monthly Winners
          </Button>
        </CardContent>
      </Card>

      {/* Weekly Winners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            Weekly Champions
          </CardTitle>
          <CardDescription>Winners from each week</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Completions</TableHead>
                <TableHead className="text-center">Streak Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyWinners.map((winner) => {
                const rankBadge = getRankBadge(winner.rank);
                return (
                  <TableRow key={winner.id}>
                    <TableCell>
                      <Badge variant="outline" className={rankBadge.color}>
                        {rankBadge.icon}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{winner.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{winner.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(winner.period_start), "MMM d")} - {format(new Date(winner.period_end), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {winner.total_completions}
                    </TableCell>
                    <TableCell className="text-center">
                      {winner.total_streak_days}
                    </TableCell>
                    <TableCell>
                      {winner.announced_at ? (
                        <Badge variant="secondary">Announced</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!winner.announced_at && winner.rank === 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => announceWinner.mutate(winner.id)}
                        >
                          <Megaphone className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {weeklyWinners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No weekly winners recorded yet. Click "Calculate Weekly Winners" to generate.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Winners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Monthly Champions
          </CardTitle>
          <CardDescription>Winners from each month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Completions</TableHead>
                <TableHead className="text-center">Streak Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyWinners.map((winner) => {
                const rankBadge = getRankBadge(winner.rank);
                return (
                  <TableRow key={winner.id}>
                    <TableCell>
                      <Badge variant="outline" className={rankBadge.color}>
                        {rankBadge.icon}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{winner.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{winner.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(winner.period_start), "MMMM yyyy")}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {winner.total_completions}
                    </TableCell>
                    <TableCell className="text-center">
                      {winner.total_streak_days}
                    </TableCell>
                    <TableCell>
                      {winner.announced_at ? (
                        <Badge variant="secondary">Announced</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!winner.announced_at && winner.rank === 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => announceWinner.mutate(winner.id)}
                        >
                          <Megaphone className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {monthlyWinners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No monthly winners recorded yet. Click "Calculate Monthly Winners" to generate.
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
