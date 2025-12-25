import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FolderNode } from '../components/FolderManagementPanel';

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string | null;
  display_order: number;
}

// Natural sort function for strings with numbers
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

export function useFolders(currentProjectId?: string | null) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [flatFolders, setFlatFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const buildFolderTree = useCallback((flatList: FolderRow[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create nodes for all folders
    for (const folder of flatList) {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
      });
    }

    // Build tree structure
    for (const folder of flatList) {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id)!.children.push(node);
      } else {
        rootFolders.push(node);
      }
    }

    // Sort children at each level by name (natural sort)
    const sortChildren = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => naturalSort(a.name, b.name));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      }
    };

    sortChildren(rootFolders);

    return rootFolders;
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      let query = supabase
        .from('floor_plan_folders')
        .select('*')
        .order('display_order', { ascending: true });

      if (currentProjectId) {
        query = query.or(`project_id.eq.${currentProjectId},project_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const folderData = data || [];
      setFlatFolders(folderData);
      setFolders(buildFolderTree(folderData));
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, buildFolderTree]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const getFolderPath = useCallback((folderId: string | null): string => {
    if (!folderId) return 'Uncategorized';

    const folder = flatFolders.find(f => f.id === folderId);
    if (!folder) return 'Uncategorized';

    const path: string[] = [folder.name];
    let current = folder;

    while (current.parent_id) {
      const parent = flatFolders.find(f => f.id === current.parent_id);
      if (parent) {
        path.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return path.join(' / ');
  }, [flatFolders]);

  return {
    folders,
    flatFolders,
    loading,
    refetch: fetchFolders,
    getFolderPath,
  };
}
