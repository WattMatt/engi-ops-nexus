import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface MessageSearchProps {
  conversationId: string;
  onMessageSelect: (messageId: string) => void;
  onClose: () => void;
}

export function MessageSearch({ conversationId, onMessageSelect, onClose }: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["message-search", conversationId, query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, profiles:sender_id(full_name)")
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      onMessageSelect(results[selectedIndex].id);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const navigateResults = (direction: "up" | "down") => {
    if (direction === "up") {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else {
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    }
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-primary/20 text-foreground px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="border-b bg-background p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search in conversation..."
            className="pl-9"
            autoFocus
          />
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>
              {selectedIndex + 1} of {results.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateResults("up")}
              disabled={selectedIndex === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateResults("down")}
              disabled={selectedIndex >= results.length - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {query.length >= 2 && (
        <ScrollArea className="max-h-48">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-2">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No results found</p>
          ) : (
            <div className="space-y-1">
              {results.map((result: any, index) => (
                <button
                  key={result.id}
                  onClick={() => onMessageSelect(result.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {result.profiles?.full_name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate">
                    {highlightMatch(result.content)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
