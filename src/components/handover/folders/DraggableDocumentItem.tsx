import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DocumentItem } from "./DocumentItem";
import { HandoverDocument, HandoverFolder } from "./types";

interface DraggableDocumentItemProps {
  document: HandoverDocument;
  folders: HandoverFolder[];
  onPreview: () => void;
  onDownload: () => void;
  onMoveToFolder: (folderId: string | null) => void;
}

export const DraggableDocumentItem = ({
  document,
  folders,
  onPreview,
  onDownload,
  onMoveToFolder,
}: DraggableDocumentItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `doc-${document.id}`,
    data: {
      type: "document",
      document,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <DocumentItem
        document={document}
        folders={folders}
        onPreview={onPreview}
        onDownload={onDownload}
        onMoveToFolder={onMoveToFolder}
      />
    </div>
  );
};
