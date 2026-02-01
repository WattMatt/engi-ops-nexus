/**
 * useProject Hook
 * Centralized hook for project context and data
 * Reduces duplication of project fetching logic across components
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  name: string;
  project_number?: string | null;
  description?: string | null;
  status?: string | null;
  client_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to manage the currently selected project
 * Syncs with localStorage and provides project data
 */
export function useProject() {
  const [projectId, setProjectIdState] = useState<string | null>(() => 
    localStorage.getItem("selectedProjectId")
  );

  // Listen for project changes from other tabs/components
  useEffect(() => {
    const handleProjectChange = () => {
      const newProjectId = localStorage.getItem("selectedProjectId");
      setProjectIdState(newProjectId);
    };

    window.addEventListener('projectChanged', handleProjectChange);
    window.addEventListener('storage', handleProjectChange);

    return () => {
      window.removeEventListener('projectChanged', handleProjectChange);
      window.removeEventListener('storage', handleProjectChange);
    };
  }, []);

  // Set project ID and update localStorage
  const setProjectId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem("selectedProjectId", id);
    } else {
      localStorage.removeItem("selectedProjectId");
    }
    setProjectIdState(id);
    window.dispatchEvent(new Event('projectChanged'));
  }, []);

  // Fetch project data
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    projectId,
    project,
    projectName: project?.name ?? null,
    projectNumber: project?.project_number ?? null,
    setProjectId,
    isLoading,
    error,
    hasProject: !!projectId,
  };
}

/**
 * Hook for fetching a list of projects the user has access to
 */
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Project[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useProject;
