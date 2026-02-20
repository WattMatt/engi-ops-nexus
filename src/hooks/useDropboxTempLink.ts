import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a Dropbox temporary link for a file path.
 * Uses the existing dropbox-api edge function's get_temporary_link action.
 */
export function useDropboxTempLink() {
  const [isLoading, setIsLoading] = useState(false);

  const getTempLink = useCallback(async (dropboxPath: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-api', {
        body: {
          action: 'get_temporary_link',
          path: dropboxPath,
        },
      });

      if (error || !data?.link) {
        console.error('Failed to get Dropbox temp link:', error || data);
        return null;
      }

      return data.link;
    } catch (err) {
      console.error('Error fetching Dropbox temp link:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getTempLink, isLoading };
}
