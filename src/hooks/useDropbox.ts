import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string;
  isDownloadable?: boolean;
}

export interface DropboxAccountInfo {
  email: string;
  name: string;
  profilePhotoUrl?: string;
  spaceUsed: number;
  spaceAllocated: number;
}

export interface DropboxConnectionStatus {
  connected: boolean;
  status: string;
  config?: {
    account_email?: string;
    account_name?: string;
    root_folder?: string;
  };
}

export function useDropbox() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<DropboxConnectionStatus | null>(null);
  const [accountInfo, setAccountInfo] = useState<DropboxAccountInfo | null>(null);
  const { toast } = useToast();

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('dropbox-auth', {
        body: null,
        method: 'GET',
        headers: {}
      });

      // Use query params approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const status = await response.json();
        setConnectionStatus(status);
        setIsConnected(status.connected);
        
        if (status.connected) {
          // Fetch account info
          await fetchAccountInfo();
        }
      }
    } catch (error) {
      console.error('Failed to check Dropbox connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch account info
  const fetchAccountInfo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=account-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        }
      );

      if (response.ok) {
        const info = await response.json();
        setAccountInfo(info);
      }
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    }
  };

  // Initiate OAuth connection
  const connect = async (): Promise<void> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=initiate`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const { authUrl } = await response.json();
        // Redirect to Dropbox OAuth
        window.location.href = authUrl;
      } else {
        throw new Error('Failed to initiate connection');
      }
    } catch (error) {
      console.error('Failed to connect to Dropbox:', error);
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to Dropbox. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Disconnect from Dropbox
  const disconnect = async (): Promise<void> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      );

      if (response.ok) {
        setIsConnected(false);
        setConnectionStatus(null);
        setAccountInfo(null);
        toast({
          title: 'Disconnected',
          description: 'Successfully disconnected from Dropbox'
        });
      }
    } catch (error) {
      console.error('Failed to disconnect from Dropbox:', error);
      toast({
        title: 'Disconnect Failed',
        description: 'Could not disconnect from Dropbox. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // List folder contents
  const listFolder = async (path: string = ''): Promise<DropboxFile[]> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=list-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.entries || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to list folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to load folder contents',
        variant: 'destructive'
      });
      return [];
    }
  };

  // Create folder
  const createFolder = async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=create-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path })
        }
      );

      if (response.ok) {
        toast({
          title: 'Folder Created',
          description: `Created folder: ${path}`
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Upload file
  const uploadFile = async (path: string, content: string | ArrayBuffer, contentType?: string): Promise<boolean> => {
    try {
      let base64Content: string;
      
      if (content instanceof ArrayBuffer) {
        const bytes = new Uint8Array(content);
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        base64Content = `data:${contentType || 'application/octet-stream'};base64,${btoa(binary)}`;
      } else if (typeof content === 'string' && !content.startsWith('data:')) {
        base64Content = content;
      } else {
        base64Content = content;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path, content: base64Content, contentType })
        }
      );

      if (response.ok) {
        toast({
          title: 'File Uploaded',
          description: `Successfully uploaded to Dropbox`
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not upload file to Dropbox',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get download link
  const getDownloadLink = async (path: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.link;
      }
      return null;
    } catch (error) {
      console.error('Failed to get download link:', error);
      toast({
        title: 'Error',
        description: 'Failed to get download link',
        variant: 'destructive'
      });
      return null;
    }
  };

  // Delete file or folder
  const deleteItem = async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path })
        }
      );

      if (response.ok) {
        toast({
          title: 'Deleted',
          description: 'Successfully deleted from Dropbox'
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete item from Dropbox',
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    connectionStatus,
    accountInfo,
    connect,
    disconnect,
    listFolder,
    createFolder,
    uploadFile,
    getDownloadLink,
    deleteItem,
    refreshConnection: checkConnection
  };
}
