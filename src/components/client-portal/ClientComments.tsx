import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, CheckCircle, Reply } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  is_resolved: boolean;
  reference_id?: string;
  parent_comment_id?: string;
  user_email?: string;
}

interface ClientCommentsProps {
  projectId: string;
  reportType: string;
  referenceId?: string;
  canComment: boolean;
}

export const ClientComments = ({ projectId, reportType, referenceId, canComment }: ClientCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('client-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_comments',
          filter: `project_id=eq.${projectId}`
        },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, reportType, referenceId]);

  const fetchComments = async () => {
    try {
      let query = supabase
        .from("client_comments")
        .select("*")
        .eq("project_id", projectId)
        .eq("report_type", reportType)
        .order("created_at", { ascending: true });

      if (referenceId) {
        query = query.eq("reference_id", referenceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("client_comments")
        .insert({
          project_id: projectId,
          user_id: user.id,
          report_type: reportType,
          reference_id: referenceId,
          comment_text: newComment.trim(),
          parent_comment_id: replyingTo
        });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      toast.success("Comment added");
    } catch (error: any) {
      toast.error("Failed to add comment: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("client_comments")
        .update({
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment resolved");
      fetchComments();
    } catch (error: any) {
      toast.error("Failed to resolve comment");
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No comments yet
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.is_resolved ? "bg-muted/50 border-muted" : "bg-card"
                } ${comment.parent_comment_id ? "ml-6" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {comment.user_email || "User"}
                      </span>
                      <div className="flex items-center gap-2">
                        {comment.is_resolved && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                    {!comment.is_resolved && canComment && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setReplyingTo(comment.id)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(comment.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add comment */}
        {canComment && (
          <div className="space-y-2 pt-2 border-t">
            {replyingTo && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Replying to comment...</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="icon"
                className="h-[60px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
