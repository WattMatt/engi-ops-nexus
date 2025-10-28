import { FileText } from "lucide-react";

interface PDFThumbnailProps {
  thumbnailUrl?: string | null;
  className?: string;
}

export const PDFThumbnail = ({ thumbnailUrl, className = "" }: PDFThumbnailProps) => {
  if (thumbnailUrl) {
    return (
      <div className={`relative bg-muted rounded-md overflow-hidden ${className}`}>
        <img 
          src={thumbnailUrl} 
          alt="Floor plan thumbnail" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative bg-muted rounded-md overflow-hidden flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <FileText className="h-12 w-12" />
        <span className="text-xs">PDF Document</span>
      </div>
    </div>
  );
};
