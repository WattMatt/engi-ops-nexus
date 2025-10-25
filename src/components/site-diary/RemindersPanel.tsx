import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Reminder {
  id: string;
  title: string;
  message: string | null;
  reminder_date: string;
  is_read: boolean;
  task_id: string | null;
  site_diary_tasks?: { title: string } | null;
}

export const RemindersPanel = () => {
  const queryClient = useQueryClient();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["user-reminders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_reminders")
        .select("*, site_diary_tasks(title)")
        .eq("user_id", user.id)
        .order("reminder_date", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as Reminder[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("user_reminders")
        .update({ is_read: true })
        .eq("id", reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reminders"] });
      toast.success("Reminder marked as read");
    },
  });

  const unreadCount = reminders?.filter((r) => !r.is_read).length || 0;

  if (isLoading) {
    return null;
  }

  if (!reminders || reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Reminders</CardTitle>
            <Badge variant="secondary">0</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No reminders
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminders
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} new</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`p-3 rounded-lg border ${
              reminder.is_read ? "bg-background" : "bg-accent/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {reminder.is_read ? (
                    <BellOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <p className="font-medium text-sm truncate">{reminder.title}</p>
                </div>
                {reminder.message && (
                  <p className="text-sm text-muted-foreground mb-2">{reminder.message}</p>
                )}
                {reminder.site_diary_tasks && (
                  <p className="text-xs text-muted-foreground">
                    Task: {reminder.site_diary_tasks.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(reminder.reminder_date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {!reminder.is_read && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAsRead.mutate(reminder.id)}
                  disabled={markAsRead.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};