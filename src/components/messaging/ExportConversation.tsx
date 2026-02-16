import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileJson, File } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildConversationPdf } from "@/utils/svg-pdf/conversationPdfBuilder";
import { svgPagesToDownload } from "@/utils/svg-pdf/svgToPdfEngine";

interface ExportConversationProps {
  conversationId: string;
  conversationTitle: string;
}

interface MessageWithSender {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  attachments: any[] | null;
  sender_name: string | null;
  sender_email: string | null;
}

export function ExportConversation({ conversationId, conversationTitle }: ExportConversationProps) {
  const [isExporting, setIsExporting] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["messages-export", conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id, attachments")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(msg => ({
        ...msg,
        attachments: msg.attachments as any[] | null,
        sender_name: profileMap.get(msg.sender_id)?.full_name || null,
        sender_email: profileMap.get(msg.sender_id)?.email || null,
      }));
    },
  });

  const getSenderName = (msg: MessageWithSender) => {
    return msg.sender_name || msg.sender_email || "Unknown";
  };

  const exportAsTxt = () => {
    if (!messages) return;
    setIsExporting(true);

    try {
      let content = `Conversation: ${conversationTitle}\n`;
      content += `Exported: ${format(new Date(), "PPpp")}\n`;
      content += "=".repeat(50) + "\n\n";

      messages.forEach((msg) => {
        const sender = getSenderName(msg);
        const time = format(new Date(msg.created_at), "PPpp");
        content += `[${time}] ${sender}:\n${msg.content}\n\n`;
      });

      const blob = new Blob([content], { type: "text/plain" });
      downloadFile(blob, `${conversationTitle}-export.txt`);
      toast.success("Exported as TXT");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJson = () => {
    if (!messages) return;
    setIsExporting(true);

    try {
      const exportData = {
        conversation: conversationTitle,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          id: msg.id,
          sender: getSenderName(msg),
          content: msg.content,
          timestamp: msg.created_at,
          hasAttachments: (msg.attachments?.length ?? 0) > 0,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      downloadFile(blob, `${conversationTitle}-export.json`);
      toast.success("Exported as JSON");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPdf = async () => {
    if (!messages) return;
    setIsExporting(true);

    try {
      const pdfMessages = messages.map((msg) => ({
        sender: getSenderName(msg),
        content: msg.content,
        timestamp: format(new Date(msg.created_at), "PPpp"),
      }));

      const svgPages = buildConversationPdf({
        title: conversationTitle,
        exportDate: format(new Date(), "PPpp"),
        messages: pdfMessages,
      });

      await svgPagesToDownload(svgPages, {
        filename: `${conversationTitle}-export.pdf`,
      });

      toast.success("Exported as PDF");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsTxt}>
          <FileText className="h-4 w-4 mr-2" />
          Export as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsJson}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPdf}>
          <File className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}