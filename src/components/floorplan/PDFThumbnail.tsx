import { FileText } from "lucide-react";

interface PDFThumbnailProps {
  url: string;
  className?: string;
}

export const PDFThumbnail = ({ url, className = "" }: PDFThumbnailProps) => {
  return (
    <div className={`relative bg-muted rounded-md overflow-hidden flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <FileText className="h-12 w-12" />
        <span className="text-xs">PDF Document</span>
      </div>
    </div>
  );
};
