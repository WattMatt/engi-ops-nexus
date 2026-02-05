 /**
  * Bulletproof File Viewer Utility
  * Handles ALL file URL formats and storage sources reliably
  */
 
 import { supabase } from '@/integrations/supabase/client';
 
 // Private buckets that require signed URLs
 const PRIVATE_BUCKETS = [
   'handover-documents',
   'budget-reports',
   'invoice-pdfs',
   'floor-plan-reports',
   'cost-report-pdfs',
   'tenant-evaluation-reports',
   'final-account-reviews',
   'tenant-documents',
   'boq-uploads',
 ];
 
 // Public buckets that can be accessed directly
 const PUBLIC_BUCKETS = [
   'project-drawings',
   'company-logos',
   'profile-photos',
 ];
 
 interface FileUrlInfo {
   isSupabaseStorage: boolean;
   bucket: string | null;
   path: string | null;
   isAuthenticated: boolean;
   originalUrl: string;
 }
 
 /**
  * Parse a URL to extract Supabase storage information
  */
 export function parseStorageUrl(url: string): FileUrlInfo {
   const result: FileUrlInfo = {
     isSupabaseStorage: false,
     bucket: null,
     path: null,
     isAuthenticated: false,
     originalUrl: url,
   };
 
   if (!url) return result;
 
   // Match Supabase storage URLs
   // Formats:
   // - /storage/v1/object/public/bucket-name/path
   // - /storage/v1/object/authenticated/bucket-name/path
   // - /storage/v1/object/sign/bucket-name/path (signed URL)
   const storagePattern = /\/storage\/v1\/object\/(public|authenticated|sign)\/([^/?]+)\/(.+?)(?:\?.*)?$/;
   const match = url.match(storagePattern);
 
   if (match) {
     result.isSupabaseStorage = true;
     result.isAuthenticated = match[1] === 'authenticated';
     result.bucket = match[2];
     result.path = decodeURIComponent(match[3]);
   }
 
   return result;
 }
 
 /**
  * Check if a bucket requires signed URLs
  */
 export function isPrivateBucket(bucket: string): boolean {
   return PRIVATE_BUCKETS.includes(bucket);
 }
 
 /**
  * Get a viewable URL for a file - handles all storage types
  * Returns a URL that can be opened in a new tab
  */
 export async function getViewableUrl(fileUrl: string): Promise<{
   url: string | null;
   error: string | null;
 }> {
   if (!fileUrl) {
     return { url: null, error: 'No file URL provided' };
   }
 
   // Handle external URLs (Dropbox, Google Drive, etc.)
   if (isExternalUrl(fileUrl)) {
     return { url: fileUrl, error: null };
   }
 
   const urlInfo = parseStorageUrl(fileUrl);
 
   // Not a Supabase storage URL - open directly
   if (!urlInfo.isSupabaseStorage) {
     return { url: fileUrl, error: null };
   }
 
   // Check if bucket requires signed URL
   const needsSignedUrl = urlInfo.bucket && (
     isPrivateBucket(urlInfo.bucket) || 
     urlInfo.isAuthenticated
   );
 
   if (needsSignedUrl && urlInfo.bucket && urlInfo.path) {
     try {
       const { data, error } = await supabase.storage
         .from(urlInfo.bucket)
         .createSignedUrl(urlInfo.path, 3600); // 1 hour expiry
 
       if (error) {
         console.error('Failed to create signed URL:', error);
         // Try to open the original URL as fallback
         return { 
           url: fileUrl, 
           error: `Signed URL failed: ${error.message}. Trying direct access.` 
         };
       }
 
       if (data?.signedUrl) {
         return { url: data.signedUrl, error: null };
       }
     } catch (err) {
       console.error('Error creating signed URL:', err);
       // Fallback to original URL
       return { 
         url: fileUrl, 
         error: 'Failed to create signed URL. Trying direct access.' 
       };
     }
   }
 
   // Public bucket - use directly
   return { url: fileUrl, error: null };
 }
 
 /**
  * Check if URL is external (not Supabase storage)
  */
 function isExternalUrl(url: string): boolean {
   const externalDomains = [
     'dropbox.com',
     'www.dropbox.com',
     'dl.dropboxusercontent.com',
     'drive.google.com',
     'docs.google.com',
     'onedrive.live.com',
   ];
 
   try {
     const urlObj = new URL(url);
     return externalDomains.some(domain => urlObj.hostname.includes(domain));
   } catch {
     return false;
   }
 }
 
 /**
  * Open a file in a new browser tab
  * Handles all URL types with proper error handling
  */
 export async function openFile(
   fileUrl: string,
   options?: {
     onError?: (error: string) => void;
     onSuccess?: () => void;
   }
 ): Promise<boolean> {
   const { url, error } = await getViewableUrl(fileUrl);
 
   if (error) {
     console.warn('File viewer warning:', error);
   }
 
   if (!url) {
     const errorMsg = error || 'Could not generate viewable URL';
     options?.onError?.(errorMsg);
     return false;
   }
 
   // Open in new tab
   const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
 
   if (!newWindow) {
     const errorMsg = 'Pop-up blocked. Please allow pop-ups for this site.';
     options?.onError?.(errorMsg);
     return false;
   }
 
   options?.onSuccess?.();
   return true;
 }
 
 /**
  * Download a file from storage
  */
 export async function downloadFile(
   fileUrl: string,
   fileName?: string,
   options?: {
     onError?: (error: string) => void;
     onSuccess?: () => void;
   }
 ): Promise<boolean> {
   const urlInfo = parseStorageUrl(fileUrl);
 
   // For Supabase storage files, use the storage API download
   if (urlInfo.isSupabaseStorage && urlInfo.bucket && urlInfo.path) {
     try {
       const { data, error } = await supabase.storage
         .from(urlInfo.bucket)
         .download(urlInfo.path);
 
       if (error) {
         console.error('Download error:', error);
         options?.onError?.(`Download failed: ${error.message}`);
         return false;
       }
 
       if (data) {
         const downloadUrl = URL.createObjectURL(data);
         const link = document.createElement('a');
         link.href = downloadUrl;
         link.download = fileName || urlInfo.path.split('/').pop() || 'download';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(downloadUrl);
         options?.onSuccess?.();
         return true;
       }
     } catch (err) {
       console.error('Download exception:', err);
       options?.onError?.('Failed to download file');
       return false;
     }
   }
 
   // For external URLs, open for download
   const { url } = await getViewableUrl(fileUrl);
   if (url) {
     window.open(url, '_blank');
     options?.onSuccess?.();
     return true;
   }
 
   options?.onError?.('Could not download file');
   return false;
 }