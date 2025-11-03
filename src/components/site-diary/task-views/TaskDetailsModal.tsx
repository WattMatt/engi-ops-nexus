import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ListTodo, 
  MessageSquare, 
  Paperclip, 
  Activity, 
  Plus,
  Upload,
  X,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface TaskDetailsModalProps {
  taskId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export const TaskDetailsModal = ({ taskId, projectId, open, onClose }: TaskDetailsModalProps) => {
  const queryClient = useQueryClient();
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch task details
  const { data: task } = useQuery({
    queryKey: ["task-details", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          *,
          profiles:assigned_to(full_name)
        `)
        .eq("id", taskId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch subtasks
  const { data: subtasks } = useQuery({
    queryKey: ["task-subtasks", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_subtasks")
        .select("*")
        .eq("parent_task_id", taskId)
        .order("position");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", comment.user_id)
            .single();
          return { ...comment, profiles: profile };
        })
      );

      return commentsWithProfiles;
    },
    enabled: open,
  });

  // Fetch attachments
  const { data: attachments } = useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const attachmentsWithProfiles = await Promise.all(
        (data || []).map(async (attachment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", attachment.user_id)
            .single();
          return { ...attachment, profiles: profile };
        })
      );

      return attachmentsWithProfiles;
    },
    enabled: open,
  });

  // Fetch activity logs
  const { data: activities } = useQuery({
    queryKey: ["task-activities", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_activity_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user profiles separately
      const activitiesWithProfiles = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", activity.user_id)
            .single();
          return { ...activity, profiles: profile };
        })
      );

      return activitiesWithProfiles;
    },
    enabled: open,
  });

  // Update task field
  const updateTask = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from("site_diary_tasks")
        .update({ [field]: value })
        .eq("id", taskId);

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("task_activity_logs").insert({
          task_id: taskId,
          user_id: user.id,
          action_type: "field_update",
          old_value: task?.[field as keyof typeof task]?.toString() || null,
          new_value: value?.toString() || null,
          metadata: { field }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-details"] });
      queryClient.invalidateQueries({ queryKey: ["task-activities"] });
      toast.success("Task updated");
    },
  });

  // Add subtask
  const addSubtask = useMutation({
    mutationFn: async () => {
      const position = subtasks?.length || 0;
      const { error } = await supabase
        .from("task_subtasks")
        .insert({
          parent_task_id: taskId,
          title: newSubtask,
          position
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks"] });
      setNewSubtask("");
      toast.success("Subtask added");
    },
  });

  // Toggle subtask
  const toggleSubtask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("task_subtasks")
        .update({ completed })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks"] });
    },
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          comment: newComment
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments"] });
      setNewComment("");
      toast.success("Comment added");
    },
  });

  // Upload attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["task-attachments"] });
      toast.success("File uploaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const completedSubtasks = subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task?.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={task?.status}
              onValueChange={(value) => updateTask.mutate({ field: "status", value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Priority</Label>
            <Select
              value={task?.priority}
              onValueChange={(value) => updateTask.mutate({ field: "priority", value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Progress</Label>
            <div className="flex items-center gap-2">
              <Progress value={task?.progress || 0} className="h-2" />
              <span className="text-sm font-medium">{task?.progress || 0}%</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="subtasks" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subtasks">
              <ListTodo className="h-4 w-4 mr-2" />
              Subtasks
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subtasks" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {totalSubtasks > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {completedSubtasks} of {totalSubtasks} completed
                      </span>
                      <span className="font-medium">{Math.round(subtaskProgress)}%</span>
                    </div>
                    <Progress value={subtaskProgress} className="h-2" />
                  </div>
                )}

                {subtasks?.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={(checked) =>
                        toggleSubtask.mutate({ id: subtask.id, completed: !!checked })
                      }
                    />
                    <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                      {subtask.title}
                    </span>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a subtask..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && newSubtask && addSubtask.mutate()}
                  />
                  <Button
                    size="sm"
                    onClick={() => addSubtask.mutate()}
                    disabled={!newSubtask}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {comments?.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.profiles?.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{(comment as any).comment}</p>
                  </div>
                ))}

                <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => addComment.mutate()}
                    disabled={!newComment}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="attachments" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>

                {attachments?.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.profiles?.full_name} • {" "}
                          {format(new Date(attachment.created_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {activities?.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">{activity.profiles?.full_name}</span>{" "}
                        {activity.action_type === "field_update" && (
                          <>
                            updated {(activity.metadata as any)?.field || "a field"}
                            {activity.old_value && (
                              <> from <Badge variant="outline" className="mx-1">{activity.old_value}</Badge></>
                            )}
                            {activity.new_value && (
                              <> to <Badge variant="outline" className="mx-1">{activity.new_value}</Badge></>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
