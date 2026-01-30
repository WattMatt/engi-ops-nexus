import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandoverFolder } from "./types";

interface FolderBreadcrumbProps {
  currentFolder: HandoverFolder | null;
  folders: HandoverFolder[];
  onNavigate: (folderId: string | null) => void;
}

export const FolderBreadcrumb = ({
  currentFolder,
  folders,
  onNavigate,
}: FolderBreadcrumbProps) => {
  // Build breadcrumb path
  const buildPath = (folder: HandoverFolder | null): HandoverFolder[] => {
    if (!folder) return [];
    
    const parent = folders.find((f) => f.id === folder.parent_folder_id);
    return [...buildPath(parent || null), folder];
  };

  const path = buildPath(currentFolder);

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 gap-1"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-3.5 w-3.5" />
        Root
      </Button>

      {path.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Button
            variant={index === path.length - 1 ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 truncate max-w-[150px]"
            onClick={() => onNavigate(folder.id)}
          >
            {folder.folder_name}
          </Button>
        </div>
      ))}
    </div>
  );
};
