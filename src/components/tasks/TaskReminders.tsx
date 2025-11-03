import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskRemindersProps {
  projectId: string;
}

export const TaskReminders = ({ projectId }: TaskRemindersProps) => {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .neq("status", "completed");

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: reminders, refetch } = useQuery({
    queryKey: ["task-reminders", projectId],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from("task_reminders")
        .select(`
          *,
          tasks (
            id,
            title,
            project_id
          )
        `)
        .eq("user_id", userData.user.id)
        .order("reminder_time");

      if (error) throw error;
      return data.filter((r: any) => r.tasks?.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const handleCreateReminder = async () => {
    if (!selectedTaskId || !reminderTime) {
      toast({
        title: "Error",
        description: "Please select a task and reminder time",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("task_reminders").insert({
      task_id: selectedTaskId,
      user_id: userData.user.id,
      reminder_time: reminderTime,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
      setSelectedTaskId("");
      setReminderTime("");
      setShowCreateDialog(false);
      refetch();
    }
  };

  const handleDeleteReminder = async (id: string) => {
    const { error } = await supabase.from("task_reminders").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Reminder deleted successfully",
      });
      refetch();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Reminders</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders && reminders.length > 0 ? (
            reminders.map((reminder: any) => (
              <Card key={reminder.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="space-y-1">
                      <h4 className="font-medium">{reminder.tasks.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reminder.reminder_time), "PPP 'at' p")}
                      </p>
                      {reminder.is_sent && (
                        <Badge variant="secondary">Sent</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No reminders set. Create reminders to stay on track.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task Reminder</DialogTitle>
            <DialogDescription>
              Set a reminder for a task to get notified at the right time
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task">Task</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reminder_time">Reminder Time</Label>
              <Input
                id="reminder_time"
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReminder}>Create Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};