import { ReactNode, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play, ExternalLink, Clock, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VideoTooltipProps {
  children: ReactNode;
  title?: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  provider?: "youtube" | "loom" | "vimeo" | "custom";
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  maxWidth?: string;
  autoPlay?: boolean;
}

/**
 * Tooltip with embedded video tutorials (YouTube/Loom style preview)
 */
export function VideoTooltip({
  children,
  title,
  description,
  videoUrl,
  thumbnailUrl,
  duration,
  provider = "custom",
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
  maxWidth = "320px",
  autoPlay = false,
}: VideoTooltipProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);

  const getEmbedUrl = () => {
    if (provider === "youtube") {
      const videoId = videoUrl.match(
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
      )?.[1];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}`
        : videoUrl;
    }
    if (provider === "loom") {
      const loomId = videoUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
      return loomId
        ? `https://www.loom.com/embed/${loomId}?autoplay=${isPlaying}`
        : videoUrl;
    }
    if (provider === "vimeo") {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      return vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?autoplay=${isPlaying ? 1 : 0}&muted=${isMuted ? 1 : 0}`
        : videoUrl;
    }
    return videoUrl;
  };

  const getProviderLabel = () => {
    switch (provider) {
      case "youtube":
        return "Watch on YouTube";
      case "loom":
        return "Watch on Loom";
      case "vimeo":
        return "Watch on Vimeo";
      default:
        return "Watch video";
    }
  };

  const getDefaultThumbnail = () => {
    if (thumbnailUrl) return thumbnailUrl;
    if (provider === "youtube") {
      const videoId = videoUrl.match(
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
      )?.[1];
      return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
    }
    return null;
  };

  const thumbnail = getDefaultThumbnail();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "p-0 bg-popover border border-border shadow-lg overflow-hidden",
            className
          )}
          style={{ maxWidth }}
        >
          <div className="flex flex-col">
            {/* Video preview / thumbnail */}
            <div className="relative aspect-video bg-muted">
              {isPlaying ? (
                <iframe
                  src={getEmbedUrl()}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : thumbnail ? (
                <img
                  src={thumbnail}
                  alt={title || "Video thumbnail"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Play overlay */}
              {!isPlaying && (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </button>
              )}

              {/* Duration badge */}
              {duration && !isPlaying && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration}
                </div>
              )}

              {/* Mute toggle when playing */}
              {isPlaying && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded hover:bg-black/80 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              {title && (
                <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                  {title}
                </h4>
              )}
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {description}
                </p>
              )}
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {getProviderLabel()}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VideoTooltip;
