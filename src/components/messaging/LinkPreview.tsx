import { useState, useEffect } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewProps {
  url: string;
  cachedPreview?: LinkPreviewData;
  className?: string;
}

// Extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.match(urlRegex) || [];
}

// Simple link preview that shows URL info
export function LinkPreview({ url, cachedPreview, className }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(cachedPreview || null);
  const [loading, setLoading] = useState(!cachedPreview);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cachedPreview) {
      setPreview(cachedPreview);
      setLoading(false);
      return;
    }

    // For now, just extract domain info from URL
    try {
      const urlObj = new URL(url);
      setPreview({
        url,
        siteName: urlObj.hostname.replace("www.", ""),
        title: urlObj.pathname.split("/").filter(Boolean).pop() || urlObj.hostname,
      });
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [url, cachedPreview]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-lg p-3 mt-2", className)}>
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mt-2" />
      </div>
    );
  }

  if (error || !preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block mt-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors",
        className
      )}
    >
      <div className="flex gap-3">
        {preview.image ? (
          <img
            src={preview.image}
            alt=""
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{preview.title || url}</p>
          {preview.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {preview.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {preview.siteName}
          </p>
        </div>
      </div>
    </a>
  );
}

// Component to render multiple link previews from text
export function LinkPreviews({ text, className }: { text: string; className?: string }) {
  const urls = extractUrls(text);
  
  if (urls.length === 0) return null;

  // Only show first 3 link previews to avoid clutter
  const limitedUrls = urls.slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      {limitedUrls.map((url, index) => (
        <LinkPreview key={`${url}-${index}`} url={url} />
      ))}
    </div>
  );
}
