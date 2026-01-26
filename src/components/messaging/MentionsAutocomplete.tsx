import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

interface MentionsAutocompleteProps {
  conversationId: string;
  inputValue: string;
  cursorPosition: number;
  onSelect: (user: User, startIndex: number, endIndex: number) => void;
  onClose: () => void;
}

export interface MentionsAutocompleteRef {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export const MentionsAutocomplete = forwardRef<MentionsAutocompleteRef, MentionsAutocompleteProps>(
  ({ conversationId, inputValue, cursorPosition, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState<{ query: string; startIndex: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get conversation participants
    const { data: participants = [] } = useQuery({
      queryKey: ["conversationParticipants", conversationId],
      queryFn: async () => {
        const { data: conversation } = await supabase
          .from("conversations")
          .select("participants")
          .eq("id", conversationId)
          .single();

        if (!conversation?.participants) return [];

        const participantIds = Array.isArray(conversation.participants) 
          ? conversation.participants as string[]
          : [];

        if (participantIds.length === 0) return [];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", participantIds);

        return (profiles || []) as User[];
      },
    });

    // Detect @mention pattern
    useEffect(() => {
      const textBeforeCursor = inputValue.substring(0, cursorPosition);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery({
          query: mentionMatch[1].toLowerCase(),
          startIndex: mentionMatch.index!,
        });
        setSelectedIndex(0);
      } else {
        setMentionQuery(null);
      }
    }, [inputValue, cursorPosition]);

    // Filter participants based on query
    const filteredUsers = mentionQuery
      ? participants.filter((user) => {
          const name = user.full_name?.toLowerCase() || "";
          const email = user.email.toLowerCase();
          return name.includes(mentionQuery.query) || email.includes(mentionQuery.query);
        })
      : [];

    // Handle keyboard navigation
    useImperativeHandle(ref, () => ({
      handleKeyDown: (e: React.KeyboardEvent) => {
        if (!mentionQuery || filteredUsers.length === 0) return false;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
            return true;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            return true;
          case "Enter":
          case "Tab":
            e.preventDefault();
            const selectedUser = filteredUsers[selectedIndex];
            if (selectedUser) {
              onSelect(
                selectedUser,
                mentionQuery.startIndex,
                cursorPosition
              );
            }
            return true;
          case "Escape":
            onClose();
            return true;
          default:
            return false;
        }
      },
    }));

    if (!mentionQuery || filteredUsers.length === 0) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden z-50"
      >
        <div className="p-1">
          {filteredUsers.map((user, index) => {
            const displayName = user.full_name || user.email;
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <button
                key={user.id}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded text-sm hover:bg-muted",
                  index === selectedIndex && "bg-muted"
                )}
                onClick={() => onSelect(user, mentionQuery.startIndex, cursorPosition)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium">{displayName}</p>
                  {user.full_name && (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

MentionsAutocomplete.displayName = "MentionsAutocomplete";
