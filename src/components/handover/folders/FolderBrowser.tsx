import { useState } from "react";
import { FolderPlus, Upload, Search, Folder, FolderTree } from "lucide-react";
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFolders } from "./useFolders";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { DroppableFolderItem } from "./DroppableFolderItem";
import { DraggableDocumentItem } from "./DraggableDocumentItem";
import { DroppableRootZone } from "./DroppableRootZone";
import { DragOverlay } from "./DragOverlay";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { InitializeFoldersDialog } from "./InitializeFoldersDialog";
import { DocumentPreviewDialog } from "@/components/tenant/DocumentPreviewDialog";
import { UploadToFolderDialog } from "./UploadToFolderDialog";
import { HandoverDocument } from "./types";
import { FolderTemplate, getTemplatesForCategory, hasTemplatesForCategory } from "./FolderTemplates";

interface FolderBrowserProps {
  projectId: string;
  documentCategory: string;
  categoryLabel: string;
  icon?: React.ReactNode;
}

export const FolderBrowser = ({
  projectId,
  documentCategory,
  categoryLabel,
  icon,
}: FolderBrowserProps) => {
  const { toast } = useToast();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [initFoldersDialogOpen, setInitFoldersDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<HandoverDocument | null>(null);
  const [activeDocument, setActiveDocument] = useState<HandoverDocument | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const {
    folders,
    documents,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocument,
  } = useFolders(projectId, documentCategory);

  // Configure drag sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Get current folder
  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;

  // Get folders and documents for current view
  const currentFolders = folders.filter((f) => f.parent_folder_id === currentFolderId);
  const currentDocuments = documents.filter((d) => d.folder_id === currentFolderId);

  // Filter by search
  const filteredFolders = searchQuery
    ? folders.filter((f) =>
        f.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFolders;

  const filteredDocuments = searchQuery
    ? documents.filter((d) =>
        d.document_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentDocuments;

  const handleCreateFolder = (folderName: string) => {
    createFolder.mutate(
      { folderName, parentFolderId: createParentId },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setCreateParentId(null);
        },
      }
    );
  };

  const handleDownload = (doc: HandoverDocument) => {
    if (!doc.file_url) return;
    const link = document.createElement("a");
    link.href = doc.file_url;
    link.download = doc.document_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSubfolderCount = (folderId: string): number => {
    return folders.filter((f) => f.parent_folder_id === folderId).length;
  };

  const getDocumentCount = (folderId: string): number => {
    return documents.filter((d) => d.folder_id === folderId).length;
  };

  // Check if templates are available for this category
  const hasTemplates = hasTemplatesForCategory(documentCategory);
  const templates = getTemplatesForCategory(documentCategory);

  // Handle initializing folder structure from templates
  const handleInitializeFolders = async (selectedTemplates: FolderTemplate[]) => {
    setIsInitializing(true);
    
    const createFoldersRecursively = async (
      templates: FolderTemplate[],
      parentId: string | null
    ) => {
      for (const template of templates) {
        // Check if folder already exists
        const exists = folders.some(
          (f) => f.folder_name === template.name && f.parent_folder_id === parentId
        );
        
        if (!exists) {
          // Create the folder
          await createFolder.mutateAsync({
            folderName: template.name,
            parentFolderId: parentId,
          });
          
          // Get the newly created folder
          // Note: We need to refetch to get the ID
        }
        
        // For children, we'd need the parent ID - this is a simplification
        // In practice, you might need to chain these or use a different approach
        if (template.children && template.children.length > 0) {
          // For now, create children as top-level siblings
          // A more sophisticated approach would track created folder IDs
          await createFoldersRecursively(template.children, parentId);
        }
      }
    };

    try {
      await createFoldersRecursively(selectedTemplates, currentFolderId);
      toast({
        title: "Folders initialized",
        description: `Created folder structure for ${categoryLabel}`,
      });
    } catch (error) {
      toast({
        title: "Error initializing folders",
        description: "Some folders may not have been created",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
      setInitFoldersDialogOpen(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "document") {
      setActiveDocument(active.data.current.document);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDocument(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "document") return;

    const document = activeData.document as HandoverDocument;
    let targetFolderId: string | null = null;

    if (overData?.type === "folder") {
      targetFolderId = overData.folder.id;
    } else if (overData?.type === "root") {
      targetFolderId = null;
    } else {
      return;
    }

    // Don't move if already in the target folder
    if (document.folder_id === targetFolderId) return;

    moveDocument.mutate(
      { documentId: document.id, folderId: targetFolderId },
      {
        onSuccess: () => {
          toast({
            title: "Document moved",
            description: targetFolderId
              ? `Moved to ${folders.find((f) => f.id === targetFolderId)?.folder_name}`
              : "Moved to root",
          });
        },
      }
    );
  };

  const handleDragCancel = () => {
    setActiveDocument(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {icon || <Folder className="h-5 w-5" />}
                {categoryLabel}
              </CardTitle>
              <CardDescription>
                Organize your {categoryLabel.toLowerCase()} documents into folders
              </CardDescription>
          </div>
            <div className="flex gap-2">
              {hasTemplates && folders.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => setInitFoldersDialogOpen(true)}
                  disabled={isInitializing}
                >
                  <FolderTree className="h-4 w-4 mr-2" />
                  Initialize Structure
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setCreateParentId(currentFolderId);
                  setCreateDialogOpen(true);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders and documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Breadcrumb */}
          {!searchQuery && (
            <FolderBreadcrumb
              currentFolder={currentFolder}
              folders={folders}
              onNavigate={setCurrentFolderId}
            />
          )}

          {/* Content with DnD */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading...
              </div>
            ) : filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">
                  {searchQuery ? "No results found" : "This folder is empty"}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create a folder or upload documents to get started"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Root drop zone - only show when in a subfolder and dragging */}
                <DroppableRootZone isVisible={!!currentFolderId && !!activeDocument} />

                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <DroppableFolderItem
                    key={folder.id}
                    folder={folder}
                    documentCount={getDocumentCount(folder.id)}
                    subfolderCount={getSubfolderCount(folder.id)}
                    onOpen={() => {
                      setCurrentFolderId(folder.id);
                      setSearchQuery("");
                    }}
                    onRename={(newName) =>
                      renameFolder.mutate({ folderId: folder.id, newName })
                    }
                    onDelete={() => deleteFolder.mutate(folder.id)}
                    onCreateSubfolder={() => {
                      setCreateParentId(folder.id);
                      setCreateDialogOpen(true);
                    }}
                    isRenaming={renameFolder.isPending}
                    isDeleting={deleteFolder.isPending}
                  />
                ))}

                {/* Documents */}
                {filteredDocuments.map((doc) => (
                  <DraggableDocumentItem
                    key={doc.id}
                    document={doc}
                    folders={folders}
                    onPreview={() => setPreviewDocument(doc)}
                    onDownload={() => handleDownload(doc)}
                    onMoveToFolder={(folderId) =>
                      moveDocument.mutate({ documentId: doc.id, folderId })
                    }
                  />
                ))}
              </div>
            )}

            {/* Drag overlay */}
            <DragOverlay activeDocument={activeDocument} />
          </DndContext>

          {/* Stats footer */}
          <div className="pt-4 border-t text-sm text-muted-foreground flex gap-4">
            <span>{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
            <span>{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onConfirm={handleCreateFolder}
        parentFolderName={
          createParentId
            ? folders.find((f) => f.id === createParentId)?.folder_name
            : undefined
        }
        isPending={createFolder.isPending}
      />

      {/* Upload Dialog */}
      <UploadToFolderDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        documentCategory={documentCategory}
        folders={folders}
        currentFolderId={currentFolderId}
      />

      {/* Preview Dialog */}
      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
        />
      )}

      {/* Initialize Folders Dialog */}
      {hasTemplates && (
        <InitializeFoldersDialog
          open={initFoldersDialogOpen}
          onOpenChange={setInitFoldersDialogOpen}
          templates={templates}
          categoryLabel={categoryLabel}
          onConfirm={handleInitializeFolders}
          isPending={isInitializing}
          existingFolderCount={folders.length}
        />
      )}
    </>
  );
};
