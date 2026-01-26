import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Bell, Check, Trash2, Clock } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MessageRemindersList() {
  const queryClient = useQueryClient();

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["message-reminders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("message_reminders")
        .select("*, message:messages(content, conversation_id)")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("remind_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const completeReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("message_reminders")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
      toast.success("Reminder completed");
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("message_reminders")
        .delete()
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
      toast.success("Reminder deleted");
    },
  });

  const pendingCount = reminders?.filter(r => isPast(new Date(r.remind_at))).length || 0;

  const formatReminderTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date)) return "Overdue";
    if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`;
    return format(date, "MMM d 'at' h:mm a");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Reminders</span>
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Message Reminders
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reminders && reminders.length > 0 ? (
            reminders.map((reminder) => {
              const isOverdue = isPast(new Date(reminder.remind_at));
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    isOverdue && "border-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className={cn(
                          "h-4 w-4",
                          isOverdue ? "text-destructive" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isOverdue && "text-destructive"
                        )}>
                          {formatReminderTime(reminder.remind_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {reminder.note || reminder.message?.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => completeReminder.mutate(reminder.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteReminder.mutate(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No pending reminders</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
