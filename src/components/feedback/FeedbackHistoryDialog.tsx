import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { VerificationCard } from "./VerificationCard";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface FeedbackHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackHistoryDialog = ({
  open,
  onOpenChange,
}: FeedbackHistoryDialogProps) => {
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: issues = [], isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ["user-issues", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("issue_reports")
        .select("*")
        .eq("reported_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const { data: suggestions = [], isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["user-suggestions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("reported_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const handleVerified = () => {
    refetchIssues();
    refetchSuggestions();
  };

  const needsReview = [...issues, ...suggestions].filter((item) => item.needs_user_attention);
  const inProgress = [...issues, ...suggestions].filter(
    (item) => ["in_progress", "reopened"].includes(item.status)
  );
  const resolved = [...issues, ...suggestions].filter((item) => item.status === "resolved");

  const isLoading = issuesLoading || suggestionsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Feedback</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="needs-review" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="needs-review">
                Needs Review
                {needsReview.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {needsReview.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress
                {inProgress.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {inProgress.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved
                {resolved.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {resolved.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="needs-review" className="space-y-4 mt-4">
              {needsReview.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No items need your review
                </p>
              ) : (
                needsReview.map((item) => (
                  <VerificationCard
                    key={item.id}
                    item={item}
                    type={"title" in item ? "suggestion" : "issue"}
                    onVerified={handleVerified}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4 mt-4">
              {inProgress.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No items in progress
                </p>
              ) : (
                inProgress.map((item) => (
                  <VerificationCard
                    key={item.id}
                    item={item}
                    type={"title" in item ? "suggestion" : "issue"}
                    onVerified={handleVerified}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4 mt-4">
              {resolved.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No resolved items yet
                </p>
              ) : (
                resolved.map((item) => (
                  <VerificationCard
                    key={item.id}
                    item={item}
                    type={"title" in item ? "suggestion" : "issue"}
                    onVerified={handleVerified}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
