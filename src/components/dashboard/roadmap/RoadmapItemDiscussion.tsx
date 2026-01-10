import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Send, Trash2, Loader2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useRoadmapComments } from "@/hooks/useRoadmapComments";

interface RoadmapItemDiscussionProps {
  itemId: string;
  itemTitle: string;
}

export const RoadmapItemDiscussion = ({ itemId, itemTitle }: RoadmapItemDiscussionProps) => {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const queryClient = useQueryClient();
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Use real-time comments hook
  const { comments, isLoading } = useRoadmapComments(itemId);

  // Get user profiles for comment authors
  const { data: profiles = {} } = useQuery({
    queryKey: ["profiles", comments?.map(c => c.user_id)],
    queryFn: async () => {
      if (!comments?.length) return {};
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      
      return (data || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, { id: string; full_name: string | null; avatar_url: string | null }>);
    },
    enabled: !!comments?.length,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("roadmap_item_comments")
        .insert({
          roadmap_item_id: itemId,
          user_id: currentUser.id,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["roadmap-comments", itemId] });
      toast.success("Comment added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("roadmap_item_comments")
        .delete()
        .eq("id", commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-comments", itemId] });
      toast.success("Comment deleted");
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from("roadmap_item_comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["roadmap-comments", itemId] });
      toast.success("Comment updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update comment");
    },
  });

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || !editingCommentId) return;
    updateComment.mutate({ commentId: editingCommentId, content: editContent.trim() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
  };

  const getInitials = (userId: string) => {
    const profile = profiles[userId];
    if (profile?.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return userId.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (userId: string) => {
    const profile = profiles[userId];
    return profile?.full_name || `User ${userId.slice(0, 8)}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Discussion for: <span className="text-foreground">{itemTitle}</span>
      </div>

      {/* Comments list */}
      <ScrollArea className="h-[300px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Start the discussion!
          </div>
        ) : (
          <div className="space-y-4">
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(comment.user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getDisplayName(comment.user_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      {comment.updated_at !== comment.created_at && " (edited)"}
                    </span>
                    {currentUser?.id === comment.user_id && editingCommentId !== comment.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(comment.id, comment.content)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => deleteComment.mutate(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="mt-1 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 px-2"
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim() || updateComment.isPending}
                        >
                          {updateComment.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] resize-none"
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!newComment.trim() || addComment.isPending}
          className="self-end"
        >
          {addComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};
