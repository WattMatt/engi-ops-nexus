import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface KnowledgeDocument {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  category: string;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  chunk_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeDocument[];
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      category,
    }: {
      file: File;
      title: string;
      description?: string;
      category?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          title,
          description,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category: category || "general",
          status: "pending",
          created_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Trigger embedding generation
      const { error: embedError } = await supabase.functions.invoke("embed-document", {
        body: { documentId: doc.id },
      });

      if (embedError) {
        console.error("Embedding error:", embedError);
        // Don't throw - the document was created, embedding will show as pending/error
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Document uploaded and processing started");
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documentsQuery.data?.find((d) => d.id === documentId);
      
      // Delete from storage
      if (doc?.file_path) {
        await supabase.storage
          .from("knowledge-documents")
          .remove([doc.file_path]);
      }

      // Delete document record (chunks cascade delete)
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Document deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete document: " + error.message);
    },
  });

  const reprocessDocument = useMutation({
    mutationFn: async (documentId: string) => {
      // Reset status
      await supabase
        .from("knowledge_documents")
        .update({ status: "pending", error_message: null })
        .eq("id", documentId);

      // Trigger reprocessing
      const { error } = await supabase.functions.invoke("embed-document", {
        body: { documentId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      toast.success("Document reprocessing started");
    },
    onError: (error) => {
      toast.error("Failed to reprocess: " + error.message);
    },
  });

  const stats = {
    total: documentsQuery.data?.length || 0,
    ready: documentsQuery.data?.filter((d) => d.status === "ready").length || 0,
    processing: documentsQuery.data?.filter((d) => d.status === "processing").length || 0,
    error: documentsQuery.data?.filter((d) => d.status === "error").length || 0,
    totalChunks: documentsQuery.data?.reduce((acc, d) => acc + (d.chunk_count || 0), 0) || 0,
  };

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    stats,
    uploadDocument,
    deleteDocument,
    reprocessDocument,
    refetch: documentsQuery.refetch,
  };
}
