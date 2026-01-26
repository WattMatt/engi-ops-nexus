import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReadReceiptsProps {
  messageId: string;
  conversationParticipants: string[];
  senderId: string;
}

export function ReadReceipts({ 
  messageId, 
  conversationParticipants,
  senderId 
}: ReadReceiptsProps) {
  const { data: receipts = [] } = useQuery({
    queryKey: ["read-receipts", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_read_receipts")
        .select("*, profiles:user_id(full_name)")
        .eq("message_id", messageId);

      if (error) throw error;
      return data;
    },
  });

  // Filter out the sender from participants
  const otherParticipants = conversationParticipants.filter((p) => p !== senderId);
  const readByCount = receipts.length;
  const allRead = readByCount >= otherParticipants.length;

  if (otherParticipants.length === 0) return null;

  const readByNames = receipts
    .map((r: any) => r.profiles?.full_name || "Unknown")
    .join(", ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center text-muted-foreground">
          {allRead ? (
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
          ) : readByCount > 0 ? (
            <CheckCheck className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {readByCount === 0 ? (
          <p>Delivered</p>
        ) : (
          <p>Read by {readByNames}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function ReadReceiptsAvatars({ messageId }: { messageId: string }) {
  const { data: receipts = [] } = useQuery({
    queryKey: ["read-receipts", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_read_receipts")
        .select("*, profiles:user_id(full_name)")
        .eq("message_id", messageId)
        .order("read_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (receipts.length === 0) return null;

  return (
    <div className="flex -space-x-1.5 mt-1">
      {receipts.slice(0, 3).map((receipt: any) => {
        const name = receipt.profiles?.full_name || "Unknown";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <Tooltip key={receipt.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-4 w-4 border-2 border-background">
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Read by {name} {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {receipts.length > 3 && (
        <div className="h-4 w-4 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">+{receipts.length - 3}</span>
        </div>
      )}
    </div>
  );
}
