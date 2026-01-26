import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useDraftMessage } from "@/hooks/useDraftMessage";
import { VoiceRecorder } from "./VoiceRecorder";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, mentions?: string[], attachments?: any[], voiceUrl?: string, voiceDuration?: number) => void;
}

export function MessageComposer({ conversationId, onSend }: MessageComposerProps) {
  const { content, setContent, clearDraft, hasDraft } = useDraftMessage(conversationId);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setTyping } = useTypingIndicator(conversationId);

  // Handle typing indicator
  const handleTypingChange = (newContent: string) => {
    setContent(newContent);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Set timeout to clear typing status after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  };

  // Clear typing status on unmount
  useEffect(() => {
    return () => {
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [setTyping]);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;

    // Clear typing indicator
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Extract mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    onSend(content, mentions, attachments);
    clearDraft();
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedFiles = [];
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: file.name,
          path: filePath,
          type: file.type,
          size: file.size,
        });
      }

      setAttachments((prev) => [...prev, ...uploadedFiles]);
      toast.success("Files uploaded");
    } catch (error: any) {
      toast.error(`Failed to upload files: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleVoiceSend = (voiceUrl: string, duration: number) => {
    onSend("🎤 Voice message", [], [], voiceUrl, duration);
    setShowVoiceRecorder(false);
  };

  if (showVoiceRecorder) {
    return (
      <VoiceRecorder
        conversationId={conversationId}
        onSend={handleVoiceSend}
        onCancel={() => setShowVoiceRecorder(false)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Draft indicator */}
      {hasDraft && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Draft saved
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
            >
              <Paperclip className="h-3 w-3" />
              <span>{file.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attach files</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Voice message</TooltipContent>
        </Tooltip>

        <Textarea
          value={content}
          onChange={(e) => handleTypingChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (use @username to mention)"
          className="flex-1 min-h-[60px] max-h-[200px]"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowScheduleDialog(true)}
              disabled={!content.trim()}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Schedule message</TooltipContent>
        </Tooltip>

        <Button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() && attachments.length === 0}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        conversationId={conversationId}
        initialContent={content}
      />
    </div>
  );
}
