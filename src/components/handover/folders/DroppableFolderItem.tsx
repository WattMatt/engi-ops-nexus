import { useDroppable } from "@dnd-kit/core";
import { FolderItem } from "./FolderItem";
import { HandoverFolder } from "./types";
import { cn } from "@/lib/utils";

interface DroppableFolderItemProps {
  folder: HandoverFolder;
  documentCount: number;
  subfolderCount: number;
  onOpen: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onCreateSubfolder: () => void;
  isRenaming: boolean;
  isDeleting: boolean;
}

export const DroppableFolderItem = ({
  folder,
  documentCount,
  subfolderCount,
  onOpen,
  onRename,
  onDelete,
  onCreateSubfolder,
  isRenaming,
  isDeleting,
}: DroppableFolderItemProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: {
      type: "folder",
      folder,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg",
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      <FolderItem
        folder={folder}
        documentCount={documentCount}
        subfolderCount={subfolderCount}
        onOpen={onOpen}
        onRename={onRename}
        onDelete={onDelete}
        onCreateSubfolder={onCreateSubfolder}
        isRenaming={isRenaming}
        isDeleting={isDeleting}
      />
    </div>
  );
};
