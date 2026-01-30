import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HandoverFolder, HandoverDocument, FolderTreeNode } from "./types";

export function useFolders(projectId: string, documentCategory: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders for this category
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["handover-folders", projectId, documentCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_folders")
        .select("*")
        .eq("project_id", projectId)
        .eq("document_category", documentCategory)
        .order("folder_name");

      if (error) throw error;
      return (data || []) as HandoverFolder[];
    },
    enabled: !!projectId,
  });

  // Fetch documents for this category
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["handover-folder-documents", projectId, documentCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents")
        .select("*")
        .eq("project_id", projectId)
        .eq("document_type", documentCategory)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as HandoverDocument[];
    },
    enabled: !!projectId,
  });

  // Build folder tree
  const buildTree = (
    folders: HandoverFolder[],
    documents: HandoverDocument[],
    parentId: string | null = null
  ): FolderTreeNode[] => {
    return folders
      .filter((f) => f.parent_folder_id === parentId)
      .map((folder) => ({
        ...folder,
        children: buildTree(folders, documents, folder.id),
        documents: documents.filter((d) => d.folder_id === folder.id),
      }));
  };

  const folderTree = buildTree(folders, documents);
  const rootDocuments = documents.filter((d) => !d.folder_id);

  // Create folder mutation
  const createFolder = useMutation({
    mutationFn: async ({
      folderName,
      parentFolderId,
    }: {
      folderName: string;
      parentFolderId: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("handover_folders")
        .insert({
          project_id: projectId,
          folder_name: folderName,
          document_category: documentCategory,
          parent_folder_id: parentFolderId,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Folder created successfully" });
      queryClient.invalidateQueries({
        queryKey: ["handover-folders", projectId, documentCategory],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rename folder mutation
  const renameFolder = useMutation({
    mutationFn: async ({
      folderId,
      newName,
    }: {
      folderId: string;
      newName: string;
    }) => {
      const { error } = await supabase
        .from("handover_folders")
        .update({ folder_name: newName })
        .eq("id", folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Folder renamed successfully" });
      queryClient.invalidateQueries({
        queryKey: ["handover-folders", projectId, documentCategory],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error renaming folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete folder mutation
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      // First move all documents in this folder to root
      await supabase
        .from("handover_documents")
        .update({ folder_id: null })
        .eq("folder_id", folderId);

      const { error } = await supabase
        .from("handover_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Folder deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["handover-folders", projectId, documentCategory],
      });
      queryClient.invalidateQueries({
        queryKey: ["handover-folder-documents", projectId, documentCategory],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Move document to folder
  const moveDocument = useMutation({
    mutationFn: async ({
      documentId,
      folderId,
    }: {
      documentId: string;
      folderId: string | null;
    }) => {
      const { error } = await supabase
        .from("handover_documents")
        .update({ folder_id: folderId })
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document moved successfully" });
      queryClient.invalidateQueries({
        queryKey: ["handover-folder-documents", projectId, documentCategory],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error moving document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    folders,
    documents,
    folderTree,
    rootDocuments,
    isLoading: foldersLoading || documentsLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocument,
  };
}
