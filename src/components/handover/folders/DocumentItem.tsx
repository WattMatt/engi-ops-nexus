import { FileText, Download, Eye, MoreHorizontal, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HandoverDocument, HandoverFolder } from "./types";
import { format } from "date-fns";

interface DocumentItemProps {
  document: HandoverDocument;
  folders: HandoverFolder[];
  onPreview: () => void;
  onDownload: () => void;
  onMoveToFolder: (folderId: string | null) => void;
}

export const DocumentItem = ({
  document,
  folders,
  onPreview,
  onDownload,
  onMoveToFolder,
}: DocumentItemProps) => {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Filter folders that are not the current folder
  const availableFolders = folders.filter((f) => f.id !== document.folder_id);

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="p-2 rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{document.document_name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>{format(new Date(document.created_at), "MMM d, yyyy")}</span>
          {document.tenants && (
            <>
              <span>•</span>
              <span>{document.tenants.shop_number}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onPreview}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {document.folder_id && (
                  <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                    📂 Root (No folder)
                  </DropdownMenuItem>
                )}
                {availableFolders.length === 0 && !document.folder_id ? (
                  <DropdownMenuItem disabled>
                    No folders available
                  </DropdownMenuItem>
                ) : (
                  availableFolders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => onMoveToFolder(folder.id)}
                    >
                      📁 {folder.folder_name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
