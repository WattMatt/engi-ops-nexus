import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addHours, addDays, setHours, setMinutes } from "date-fns";

interface MessageReminderProps {
  messageId: string;
  messagePreview: string;
}

export function MessageReminder({ messageId, messagePreview }: MessageReminderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const quickOptions = [
    { label: "In 1 hour", getValue: () => addHours(new Date(), 1) },
    { label: "In 3 hours", getValue: () => addHours(new Date(), 3) },
    { label: "Tomorrow 9am", getValue: () => setHours(setMinutes(addDays(new Date(), 1), 0), 9) },
    { label: "Next week", getValue: () => setHours(setMinutes(addDays(new Date(), 7), 0), 9) },
  ];

  const createReminder = useMutation({
    mutationFn: async (remindAt: Date) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("message_reminders")
        .insert({
          message_id: messageId,
          user_id: user.id,
          remind_at: remindAt.toISOString(),
          note: note || `Reminder: ${messagePreview.substring(0, 50)}...`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reminders"] });
      setIsOpen(false);
      setDate(undefined);
      setNote("");
      toast.success("Reminder set!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSetReminder = () => {
    if (!date) return;

    const [hours, minutes] = time.split(":").map(Number);
    const remindAt = setMinutes(setHours(date, hours), minutes);
    createReminder.mutate(remindAt);
  };

  const handleQuickOption = (getValue: () => Date) => {
    createReminder.mutate(getValue());
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 px-2">
          <Bell className="h-3 w-3" />
          <span className="text-xs">Remind</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Set Reminder
          </h4>

          {/* Quick options */}
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => handleQuickOption(option.getValue)}
              >
                <Clock className="h-3 w-3 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Or choose specific time:</p>
            
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />

            <div className="flex gap-2">
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, "0");
                  return [
                    <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                      {hour}:00
                    </SelectItem>,
                    <SelectItem key={`${hour}:30`} value={`${hour}:30`}>
                      {hour}:30
                    </SelectItem>,
                  ];
                }).flat()}
                </SelectContent>
              </Select>

              <Input
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1"
              />
            </div>

            <Button
              className="w-full"
              disabled={!date}
              onClick={handleSetReminder}
            >
              Set Reminder
              {date && (
                <span className="ml-2 text-xs opacity-75">
                  {format(date, "MMM d")} at {time}
                </span>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
