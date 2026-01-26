import { useState } from "react";
import { FileText, Download, X, Maximize2, Image as ImageIcon, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface FilePreviewProps {
  attachment: Attachment;
  className?: string;
}

// Get file icon based on type
function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;
  return FileText;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Check if file is previewable
function isPreviewable(type: string): boolean {
  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf"
  );
}

export function FilePreview({ attachment, className }: FilePreviewProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const Icon = getFileIcon(attachment.type);
  const canPreview = isPreviewable(attachment.type);
  const isImage = attachment.type.startsWith("image/");
  const isVideo = attachment.type.startsWith("video/");
  const isAudio = attachment.type.startsWith("audio/");

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg overflow-hidden border bg-muted/30",
          canPreview && "cursor-pointer",
          className
        )}
        onClick={() => canPreview && setShowFullPreview(true)}
      >
        {isImage ? (
          <div className="relative">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-[300px] max-h-[200px] object-contain"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ) : isVideo ? (
          <video
            src={attachment.url}
            controls
            className="max-w-[300px] max-h-[200px]"
            preload="metadata"
          />
        ) : isAudio ? (
          <div className="p-3 flex items-center gap-3">
            <Music className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              <audio
                src={attachment.url}
                controls
                className="w-full mt-2 h-8"
                preload="metadata"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 flex items-center gap-3">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                window.open(attachment.url, "_blank");
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Full preview dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{attachment.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(attachment.url, "_blank")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {isImage && (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {isVideo && (
              <video
                src={attachment.url}
                controls
                autoPlay
                className="max-w-full max-h-[70vh]"
              />
            )}
            {attachment.type === "application/pdf" && (
              <iframe
                src={attachment.url}
                className="w-full h-[70vh]"
                title={attachment.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component to render multiple file previews
export function FilePreviewList({ attachments, className }: { attachments: Attachment[]; className?: string }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 mt-2", className)}>
      {attachments.map((attachment, index) => (
        <FilePreview key={`${attachment.name}-${index}`} attachment={attachment} />
      ))}
    </div>
  );
}
