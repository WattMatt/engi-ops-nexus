import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cloud, Upload, Loader2 } from "lucide-react";
import { useDropbox, DropboxFile } from "@/hooks/useDropbox";
import { ImportFromDropboxDialog } from "./ImportFromDropboxDialog";

interface DropboxFileInputProps {
  /** Callback when a file is selected (from Dropbox or local) */
  onFileSelect: (file: File) => void;
  /** Callback when file content is loaded from Dropbox */
  onDropboxFileSelect?: (file: DropboxFile, content: ArrayBuffer) => void;
  /** Allowed file extensions (e.g., ['.xlsx', '.xls', '.pdf']) */
  allowedExtensions?: string[];
  /** Accept attribute for file input */
  accept?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Custom class name */
  className?: string;
  /** Whether to show as compact inline buttons */
  compact?: boolean;
  /** Whether to show the local file option */
  showLocalOption?: boolean;
  /** Import dialog title */
  dropboxTitle?: string;
  /** Import dialog description */
  dropboxDescription?: string;
}

/**
 * A unified file input component that supports both local files and Dropbox import.
 * Use this as a drop-in replacement for file inputs where Dropbox import is desired.
 */
export function DropboxFileInput({
  onFileSelect,
  onDropboxFileSelect,
  allowedExtensions,
  accept,
  disabled = false,
  isLoading = false,
  placeholder = "Select a file or import from Dropbox",
  className = "",
  compact = false,
  showLocalOption = true,
  dropboxTitle = "Import from Dropbox",
  dropboxDescription = "Select a file from your Dropbox",
}: DropboxFileInputProps) {
  const { isConnected } = useDropbox();
  const [showDropboxDialog, setShowDropboxDialog] = useState(false);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDropboxFileSelect = async (file: DropboxFile, content: ArrayBuffer) => {
    // If callback is provided, use it
    if (onDropboxFileSelect) {
      onDropboxFileSelect(file, content);
    } else {
      // Otherwise, convert to File object and use standard callback
      const blob = new Blob([content]);
      const localFile = new File([blob], file.name, { 
        type: getMimeType(file.name) 
      });
      onFileSelect(localFile);
    }
  };

  // Helper to get MIME type from filename
  const getMimeType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'csv': 'text/csv',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'ies': 'application/octet-stream',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-2 ${className}`}>
          {showLocalOption && (
            <label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isLoading}
                asChild
              >
                <span>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Local File
                </span>
              </Button>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleLocalFileChange}
                disabled={disabled || isLoading}
              />
            </label>
          )}
          
          {isConnected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDropboxDialog(true)}
              disabled={disabled || isLoading}
            >
              <Cloud className="h-4 w-4 mr-2" />
              Dropbox
            </Button>
          )}
        </div>

        <ImportFromDropboxDialog
          open={showDropboxDialog}
          onOpenChange={setShowDropboxDialog}
          onFileSelect={handleDropboxFileSelect}
          allowedExtensions={allowedExtensions}
          title={dropboxTitle}
          description={dropboxDescription}
        />
      </>
    );
  }

  return (
    <>
      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${className}`}>
        <p className="text-sm text-muted-foreground mb-4">
          {placeholder}
        </p>
        
        <div className="flex items-center justify-center gap-3">
          {showLocalOption && (
            <label>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || isLoading}
                asChild
              >
                <span>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Select Local File
                </span>
              </Button>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleLocalFileChange}
                disabled={disabled || isLoading}
              />
            </label>
          )}
          
          {isConnected && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDropboxDialog(true)}
              disabled={disabled || isLoading}
            >
              <Cloud className="h-4 w-4 mr-2" />
              Import from Dropbox
            </Button>
          )}
        </div>

        {allowedExtensions && allowedExtensions.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Supported formats: {allowedExtensions.join(', ')}
          </p>
        )}
      </div>

      <ImportFromDropboxDialog
        open={showDropboxDialog}
        onOpenChange={setShowDropboxDialog}
        onFileSelect={handleDropboxFileSelect}
        allowedExtensions={allowedExtensions}
        title={dropboxTitle}
        description={dropboxDescription}
      />
    </>
  );
}
