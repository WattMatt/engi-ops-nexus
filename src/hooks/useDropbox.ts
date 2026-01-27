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

// Helper to get auth header
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return {};
  }
  return {
    'Authorization': `Bearer ${session.access_token}`
  };
}

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `dbx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useDropbox() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<DropboxConnectionStatus | null>(null);
  const [accountInfo, setAccountInfo] = useState<DropboxAccountInfo | null>(null);
  const { toast } = useToast();

  // Check connection status for current user
  const checkConnection = useCallback(async () => {
    const correlationId = generateCorrelationId();
    console.log('[Dropbox] Checking connection status', { correlationId, timestamp: new Date().toISOString() });
    
    try {
      setIsLoading(true);
      
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...authHeaders
          }
        }
      );

      if (response.ok) {
        const status = await response.json();
        console.log('[Dropbox] Connection status received', { correlationId, status: status.status, connected: status.connected });
        setConnectionStatus(status);
        setIsConnected(status.connected);
        setConnectionError(null);
        
        if (status.connected) {
          // Fetch account info
          await fetchAccountInfo();
        } else {
          setAccountInfo(null);
        }
      } else {
        console.warn('[Dropbox] Status check failed', { correlationId, status: response.status });
        setIsConnected(false);
        setConnectionStatus(null);
        setAccountInfo(null);
      }
    } catch (error) {
      console.error('[Dropbox] Connection check error', { correlationId, error });
      setIsConnected(false);
      setConnectionStatus(null);
      setAccountInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch account info for current user
  const fetchAccountInfo = async () => {
    const correlationId = generateCorrelationId();
    console.log('[Dropbox] Fetching account info', { correlationId });
    
    try {
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=account-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...authHeaders
          },
          body: JSON.stringify({})
        }
      );

      if (response.ok) {
        const info = await response.json();
        console.log('[Dropbox] Account info received', { correlationId, email: info.email });
        setAccountInfo(info);
      } else {
        console.error('[Dropbox] Failed to fetch account info', { correlationId, status: response.status });
      }
    } catch (error) {
      console.error('[Dropbox] Account info error', { correlationId, error });
    }
  };

  // Initiate OAuth connection for current user
  const connect = async (returnUrl?: string): Promise<void> => {
    const correlationId = generateCorrelationId();
    console.log('[Dropbox] Connection initiated', { 
      correlationId, 
      timestamp: new Date().toISOString(),
      returnUrl: returnUrl || 'auto-detect'
    });
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const authHeaders = await getAuthHeader();
      
      if (!authHeaders['Authorization']) {
        const errorMsg = 'Authentication required. Please log in to connect your Dropbox account.';
        console.error('[Dropbox] No auth token', { correlationId });
        setConnectionError(errorMsg);
        setIsConnecting(false);
        toast({
          title: 'Authentication Required',
          description: 'Please log in to connect your Dropbox account.',
          variant: 'destructive'
        });
        return;
      }

      // Use current path as return URL if not specified
      const effectiveReturnUrl = returnUrl || window.location.pathname + window.location.search;
      console.log('[Dropbox] Requesting auth URL', { correlationId, effectiveReturnUrl });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=initiate&returnUrl=${encodeURIComponent(effectiveReturnUrl)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...authHeaders
          }
        }
      );

      if (response.ok) {
        const { authUrl } = await response.json();
        console.log('[Dropbox] Auth URL received, redirecting...', { 
          correlationId, 
          authUrlLength: authUrl?.length,
          timestamp: new Date().toISOString()
        });
        
        // Store correlation ID for tracking the complete flow
        sessionStorage.setItem('dropbox_oauth_correlation_id', correlationId);
        sessionStorage.setItem('dropbox_oauth_started_at', new Date().toISOString());
        
        // Navigate to Dropbox OAuth - use top-level window to avoid iframe restrictions
        // In an iframe (like Lovable preview), we need to navigate the top window
        try {
          if (window.top && window.top !== window) {
            // We're in an iframe - navigate top window
            window.top.location.href = authUrl;
          } else {
            // We're not in an iframe - direct navigation
            window.location.href = authUrl;
          }
        } catch (securityError) {
          // Cross-origin iframe restriction - fall back to opening in new tab
          console.warn('[Dropbox] Cannot access top window due to cross-origin restrictions, opening in new tab', { correlationId });
          window.open(authUrl, '_blank');
          setIsConnecting(false);
          toast({
            title: 'Dropbox Login Opened',
            description: 'Complete the login in the new tab, then refresh this page.',
          });
        }
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to initiate connection';
        console.error('[Dropbox] Auth initiation failed', { correlationId, error: errorMsg, status: response.status });
        setConnectionError(errorMsg);
        setIsConnecting(false);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Could not connect to Dropbox. Please try again.';
      console.error('[Dropbox] Connection error', { correlationId, error, errorMsg });
      setConnectionError(errorMsg);
      setIsConnecting(false);
      toast({
        title: 'Connection Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    }
  };

  // Disconnect current user from Dropbox
  const disconnect = async (): Promise<void> => {
    const correlationId = generateCorrelationId();
    console.log('[Dropbox] Disconnect initiated', { correlationId });
    
    try {
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-auth?action=disconnect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...authHeaders
          }
        }
      );

      if (response.ok) {
        console.log('[Dropbox] Disconnected successfully', { correlationId });
        setIsConnected(false);
        setConnectionStatus(null);
        setAccountInfo(null);
        setConnectionError(null);
        toast({
          title: 'Disconnected',
          description: 'Successfully disconnected from Dropbox'
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('[Dropbox] Disconnect error', { correlationId, error });
      toast({
        title: 'Disconnect Failed',
        description: 'Could not disconnect from Dropbox. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // List folder contents
  const listFolder = async (path: string = '', options?: { silent?: boolean }): Promise<DropboxFile[]> => {
    const correlationId = generateCorrelationId();
    const silent = options?.silent ?? false;
    
    try {
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=list-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...authHeaders
          },
          body: JSON.stringify({ path })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.entries || [];
      }
      
      const error = await response.json();
      if (response.status === 401 && !silent) {
        setIsConnected(false);
        toast({
          title: 'Connection Expired',
          description: 'Please reconnect your Dropbox account.',
          variant: 'destructive'
        });
      }
      return [];
    } catch (error) {
      console.error('[Dropbox] List folder error', { correlationId, error });
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to load folder contents',
          variant: 'destructive'
        });
      }
      return [];
    }
  };

  // Create folder
  const createFolder = async (path: string): Promise<boolean> => {
    try {
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=create-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
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

      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
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
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
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

  // Download file content as ArrayBuffer
  const downloadFile = async (path: string): Promise<ArrayBuffer | null> => {
    try {
      const link = await getDownloadLink(path);
      if (!link) return null;

      const response = await fetch(link);
      if (response.ok) {
        return await response.arrayBuffer();
      }
      return null;
    } catch (error) {
      console.error('Failed to download file:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download file from Dropbox',
        variant: 'destructive'
      });
      return null;
    }
  };

  // Delete file or folder
  const deleteItem = async (path: string): Promise<boolean> => {
    try {
      const authHeaders = await getAuthHeader();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dropbox-api?action=delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
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

  // Clear connection error
  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // Check connection on mount and when auth state changes
  useEffect(() => {
    checkConnection();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkConnection();
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    isConnecting,
    connectionError,
    connectionStatus,
    accountInfo,
    connect,
    disconnect,
    listFolder,
    createFolder,
    uploadFile,
    getDownloadLink,
    downloadFile,
    deleteItem,
    refreshConnection: checkConnection,
    clearError
  };
}
