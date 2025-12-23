import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, Send, User, Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CommentsPanelProps {
  sectionId: string;
  itemId?: string | null; // null = section-level comments, string = item-specific comments
  reviewId?: string;
  isContractor?: boolean;
  contractorName?: string;
  variant?: "compact" | "full"; // compact for inline item comments, full for section comments
}

interface Comment {
  id: string;
  author_type: string;
  author_name: string;
  author_id: string | null;
  comment_text: string;
  created_at: string;
  item_id: string | null;
}

export function CommentsPanel({
  sectionId,
  itemId = null,
  reviewId,
  isContractor = false,
  contractorName,
  variant = "full",
}: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const queryKey = itemId 
    ? ["comments", "item", itemId] 
    : ["comments", "section", sectionId];

  const { data: comments, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("final_account_section_comments")
        .select("*")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: true });

      // Filter by item_id: if itemId provided, get item comments; otherwise get section-level only
      if (itemId) {
        query = query.eq("item_id", itemId);
      } else {
        query = query.is("item_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Comment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      let authorName = contractorName || "Contractor";
      let authorId = null;

      if (!isContractor) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        authorId = user.id;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        authorName = profile?.full_name || user.email || "Team Member";
      }

      const { error } = await supabase
        .from("final_account_section_comments")
        .insert({
          section_id: sectionId,
          item_id: itemId,
          review_id: reviewId,
          author_type: isContractor ? "contractor" : "internal",
          author_id: authorId,
          author_name: authorName,
          comment_text: commentText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      refetch();
      // Also invalidate item comment counts for the portal
      queryClient.invalidateQueries({ queryKey: ["all-item-comments"] });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("final_account_section_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["all-item-comments"] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete comment: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  // Check if user can delete a comment
  const canDeleteComment = (comment: Comment) => {
    // Contractors can delete their own contractor comments
    if (isContractor && comment.author_type === "contractor" && comment.author_name === contractorName) {
      return true;
    }
    // Internal users can delete their own internal comments (we check by author_type since we don't have auth.uid() in contractor context)
    if (!isContractor && comment.author_type === "internal") {
      return true;
    }
    return false;
  };

  const isCompact = variant === "compact";

  if (isLoading) {
    return (
      <div className={`${isCompact ? 'p-2' : 'p-4'} text-center text-muted-foreground text-sm`}>
        Loading comments...
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      {/* Header - only show in full variant */}
      {!isCompact && (
        <div className="p-3 border-b flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium">Comments</span>
          <span className="text-muted-foreground text-sm">({comments?.length || 0})</span>
        </div>
      )}

      {/* Comments List */}
      <ScrollArea className={isCompact ? "max-h-[180px]" : "h-[300px]"}>
        <div className={`${isCompact ? 'p-2 space-y-2' : 'p-3 space-y-3'}`}>
          {comments?.length === 0 ? (
            <p className={`text-center text-muted-foreground ${isCompact ? 'text-xs py-2' : 'text-sm py-8'}`}>
              No comments yet{isCompact ? '' : '. Start the discussion.'}
            </p>
          ) : (
            comments?.map((comment) => (
              <div
                key={comment.id}
                className={`${isCompact ? 'p-2' : 'p-3'} rounded-lg ${
                  comment.author_type === "contractor"
                    ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800"
                    : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {comment.author_type === "contractor" ? (
                      <Building2 className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-orange-600 shrink-0`} />
                    ) : (
                      <User className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600 shrink-0`} />
                    )}
                    <span className={`font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                      {comment.author_name}
                    </span>
                    <span className={`text-muted-foreground ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                      {format(new Date(comment.created_at), isCompact ? "MMM d, h:mm a" : "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  {canDeleteComment(comment) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${isCompact ? 'h-5 w-5' : 'h-6 w-6'} text-muted-foreground hover:text-destructive shrink-0`}
                        >
                          <Trash2 className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <p className={`${isCompact ? 'text-xs' : 'text-sm'} whitespace-pre-wrap`}>
                  {comment.comment_text}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={`${isCompact ? 'p-2' : 'p-3'} border-t`}>
        <div className={`flex ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className={isCompact ? "min-h-[36px] text-sm" : "min-h-[60px]"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            className={isCompact ? "h-9 w-9" : undefined}
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </div>
        {!isCompact && (
          <p className="text-xs text-muted-foreground mt-1">
            Press Cmd+Enter or Ctrl+Enter to send
          </p>
        )}
      </div>
    </div>
  );
}

// Keep backward compatibility exports
export { CommentsPanel as SectionCommentsPanel };
export { CommentsPanel as ItemCommentsPanel };
