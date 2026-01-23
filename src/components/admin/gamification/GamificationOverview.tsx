import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame, Target, Users, Crown, Medal, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface UserStats {
  user_id: string;
  full_name: string;
  email: string;
  total_completions: number;
  best_streak: number;
  current_streak: number;
  projects_count: number;
  is_weekly_leader: boolean;
  is_monthly_leader: boolean;
}

function getStreakBadge(streak: number) {
  if (streak >= 30) return { label: "Legendary", color: "bg-amber-500 text-white", emoji: "🏆" };
  if (streak >= 14) return { label: "On Fire", color: "bg-orange-500 text-white", emoji: "🔥" };
  if (streak >= 7) return { label: "Hot", color: "bg-red-500 text-white", emoji: "⭐" };
  if (streak >= 3) return { label: "Warming Up", color: "bg-yellow-500 text-white", emoji: "💪" };
  return { label: "Starting", color: "bg-muted text-muted-foreground", emoji: "🌱" };
}

export function GamificationOverview() {
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["gamification-overview"],
    queryFn: async () => {
      // Get all streak data
      const { data: streaks, error: streakError } = await supabase
        .from("roadmap_completion_streaks")
        .select("*");

      if (streakError) throw streakError;

      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profileError) throw profileError;

      // Aggregate stats by user
      const userStatsMap = new Map<string, UserStats>();

      streaks?.forEach((streak) => {
        const profile = profiles?.find((p) => p.id === streak.user_id);
        const existing = userStatsMap.get(streak.user_id);

        if (existing) {
          existing.total_completions += streak.total_completions || 0;
          existing.best_streak = Math.max(existing.best_streak, streak.longest_streak || 0);
          existing.current_streak = Math.max(existing.current_streak, streak.current_streak || 0);
          existing.projects_count += 1;
        } else {
          userStatsMap.set(streak.user_id, {
            user_id: streak.user_id,
            full_name: profile?.full_name || "Unknown User",
            email: profile?.email || "",
            total_completions: streak.total_completions || 0,
            best_streak: streak.longest_streak || 0,
            current_streak: streak.current_streak || 0,
            projects_count: 1,
            is_weekly_leader: false,
            is_monthly_leader: false,
          });
        }
      });

      // Sort by total completions and mark leaders
      // Business owner email - excluded from winning but still tracked
      const EXCLUDED_OWNER_EMAIL = "arno@wmeng.co.za";
      
      const sortedUsers = Array.from(userStatsMap.values()).sort(
        (a, b) => b.total_completions - a.total_completions
      );

      // Find the first eligible winner (not the business owner)
      const eligibleWinner = sortedUsers.find(
        (u) => u.email.toLowerCase() !== EXCLUDED_OWNER_EMAIL.toLowerCase()
      );
      
      if (eligibleWinner) {
        eligibleWinner.is_weekly_leader = true;
        eligibleWinner.is_monthly_leader = true;
      }

      // Calculate summary stats
      const totalCompletions = sortedUsers.reduce((sum, u) => sum + u.total_completions, 0);
      const activeUsers = sortedUsers.filter((u) => u.current_streak > 0).length;
      const avgStreak = sortedUsers.length > 0 
        ? Math.round(sortedUsers.reduce((sum, u) => sum + u.current_streak, 0) / sortedUsers.length)
        : 0;

      return {
        users: sortedUsers,
        summary: {
          totalCompletions,
          activeUsers,
          totalUsers: sortedUsers.length,
          avgStreak,
          topStreak: sortedUsers[0]?.best_streak || 0,
        },
      };
    },
  });

  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-weekly-streak-summary", {
        body: { test_email: "arno@wmeng.co.za" },
      });
      if (error) throw error;
      toast.success("Test email sent to arno@wmeng.co.za");
    } catch (error: any) {
      toast.error("Failed to send test email: " + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.totalCompletions || 0}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Streaks</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.summary.totalUsers || 0} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Streak</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.avgStreak || 0} days</div>
            <p className="text-xs text-muted-foreground">Current average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Streak</CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.topStreak || 0} days</div>
            <p className="text-xs text-muted-foreground">Longest streak ever</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleSendTestEmail} disabled={sendingEmail}>
          <Send className="h-4 w-4 mr-2" />
          {sendingEmail ? "Sending..." : "Send Test Summary Email"}
        </Button>
      </div>

      {/* User Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Progress Leaderboard
          </CardTitle>
          <CardDescription>
            All users ranked by total task completions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-center">Current Streak</TableHead>
                <TableHead className="text-center">Best Streak</TableHead>
                <TableHead className="text-center">Total Done</TableHead>
                <TableHead className="text-center">Projects</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.users.map((user, index) => {
                const badge = getStreakBadge(user.current_streak);
                const isExcludedOwner = user.email.toLowerCase() === "arno@wmeng.co.za";
                const eligibleRank = isExcludedOwner ? null : 
                  stats.users.filter((u, i) => i < index && u.email.toLowerCase() !== "arno@wmeng.co.za").length + 1;
                const rankEmoji = eligibleRank === 1 ? "🥇" : eligibleRank === 2 ? "🥈" : eligibleRank === 3 ? "🥉" : null;

                return (
                  <TableRow key={user.user_id} className={isExcludedOwner ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      {isExcludedOwner ? (
                        <span className="text-muted-foreground text-xs">Owner</span>
                      ) : rankEmoji ? (
                        <span className="text-xl">{rankEmoji}</span>
                      ) : (
                        <span className="text-muted-foreground">#{eligibleRank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_weekly_leader && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {user.full_name}
                            {isExcludedOwner && (
                              <Badge variant="outline" className="ml-2 text-xs">Not Eligible</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{user.current_streak}</span>
                      <span className="text-muted-foreground ml-1">days</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{user.best_streak}</span>
                      <span className="text-muted-foreground ml-1">days</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary">{user.total_completions}</span>
                    </TableCell>
                    <TableCell className="text-center">{user.projects_count}</TableCell>
                    <TableCell>
                      <Badge className={badge.color}>
                        {badge.emoji} {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!stats?.users || stats.users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No streak data yet. Users will appear here once they start completing tasks.
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
