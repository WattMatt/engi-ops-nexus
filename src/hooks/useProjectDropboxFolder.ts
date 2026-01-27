import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get the Dropbox folder path configured for the current project.
 * Uses the selectedProjectId from localStorage.
 */
export function useProjectDropboxFolder() {
  const [dropboxFolderPath, setDropboxFolderPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const savedProjectId = localStorage.getItem("selectedProjectId");
    setProjectId(savedProjectId);
    
    if (!savedProjectId) {
      setLoading(false);
      return;
    }

    const fetchFolder = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("dropbox_folder_path")
          .eq("id", savedProjectId)
          .single();

        if (error) {
          console.error("Error fetching project Dropbox folder:", error);
        } else if (data) {
          setDropboxFolderPath(data.dropbox_folder_path);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFolder();
  }, []);

  return { dropboxFolderPath, loading, projectId };
}

/**
 * Fetch Dropbox folder path for a specific project ID.
 */
export async function getProjectDropboxFolder(projectId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("dropbox_folder_path")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error fetching project Dropbox folder:", error);
      return null;
    }

    return data?.dropbox_folder_path || null;
  } catch (error) {
    console.error("Error fetching project Dropbox folder:", error);
    return null;
  }
}
