import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BarChart3, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ReactionsAnalyticsProps {
  conversationId: string;
}

interface ReactionStat {
  emoji: string;
  count: number;
  percentage: number;
}

export function ReactionsAnalytics({ conversationId }: ReactionsAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["reaction-analytics", conversationId],
    queryFn: async () => {
      const { data: reactions, error } = await supabase
        .from("message_reactions")
        .select("emoji, message_id")
        .eq("message_id", conversationId);

      // Get all messages for this conversation first
      const { data: messages } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      if (!messages) return { reactions: [], totalMessages: 0, totalReactions: 0 };

      const messageIds = messages.map(m => m.id);

      // Get reactions for these messages
      const { data: allReactions } = await supabase
        .from("message_reactions")
        .select("emoji")
        .in("message_id", messageIds);

      if (!allReactions || allReactions.length === 0) {
        return { reactions: [], totalMessages: messages.length, totalReactions: 0 };
      }

      // Count reactions by emoji
      const emojiCounts: Record<string, number> = {};
      allReactions.forEach(r => {
        emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
      });

      const total = allReactions.length;
      const reactionStats: ReactionStat[] = Object.entries(emojiCounts)
        .map(([emoji, count]) => ({
          emoji,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        reactions: reactionStats,
        totalMessages: messages.length,
        totalReactions: total,
      };
    },
    enabled: isOpen,
  });

  const topEmoji = stats?.reactions[0]?.emoji || "👍";
  const engagementRate = stats?.totalMessages 
    ? Math.round((stats.totalReactions / stats.totalMessages) * 100) 
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Analytics</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reactions Analytics
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Reactions</p>
              <p className="text-2xl font-bold">{stats?.totalReactions || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{engagementRate}%</p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>

          {/* Top Emoji */}
          {stats?.reactions && stats.reactions.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">Most Used Reaction</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{topEmoji}</span>
              <div>
                <p className="font-medium">{stats.reactions[0]?.count} times</p>
                <p className="text-sm text-muted-foreground">
                  {stats.reactions[0]?.percentage}% of all reactions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reaction Breakdown */}
          <div className="space-y-3">
            <h3 className="font-medium">Reaction Breakdown</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : stats?.reactions && stats.reactions.length > 0 ? (
              <div className="space-y-3">
                {stats.reactions.map((stat) => (
                  <div key={stat.emoji} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{stat.emoji}</span>
                        <Badge variant="secondary">{stat.count}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {stat.percentage}%
                      </span>
                    </div>
                    <Progress value={stat.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reactions yet in this conversation
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
