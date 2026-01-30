import { useState } from "react";
import { FolderPlus, Upload, Search, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFolders } from "./useFolders";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { FolderItem } from "./FolderItem";
import { DocumentItem } from "./DocumentItem";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { DocumentPreviewDialog } from "@/components/tenant/DocumentPreviewDialog";
import { UploadToFolderDialog } from "./UploadToFolderDialog";
import { HandoverFolder, HandoverDocument } from "./types";

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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<HandoverDocument | null>(null);

  const {
    folders,
    documents,
    folderTree,
    rootDocuments,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocument,
  } = useFolders(projectId, documentCategory);

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

          {/* Content */}
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
              {/* Folders */}
              {filteredFolders.map((folder) => (
                <FolderItem
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
                <DocumentItem
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
    </>
  );
};
