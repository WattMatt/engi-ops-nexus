import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2 } from "lucide-react";
import { useDropbox } from "@/hooks/useDropbox";
import { DropboxSaveDialog } from "./DropboxSaveDialog";

interface DropboxSaveButtonProps {
  /** The file content to upload - can be base64, ArrayBuffer, or Blob */
  fileContent: string | ArrayBuffer | Blob | null;
  /** Suggested filename */
  filename: string;
  /** Content type of the file */
  contentType?: string;
  /** Optional callback after successful upload */
  onSuccess?: (path: string) => void;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show as icon only */
  iconOnly?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Default folder path in Dropbox */
  defaultFolder?: string;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Custom className */
  className?: string;
}

/**
 * A button that opens the Dropbox save dialog.
 * Use this wherever you want to offer "Save to Dropbox" functionality.
 */
export function DropboxSaveButton({
  fileContent,
  filename,
  contentType = "application/pdf",
  onSuccess,
  variant = "outline",
  size = "sm",
  iconOnly = false,
  buttonText = "Save to Dropbox",
  disabled = false,
  defaultFolder = "",
  title,
  description,
  className,
}: DropboxSaveButtonProps) {
  const { isConnected } = useDropbox();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || !fileContent}
        title={buttonText}
        className={className}
      >
        {iconOnly ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <>
            <Cloud className="h-4 w-4 mr-2" />
            {buttonText}
          </>
        )}
      </Button>

      <DropboxSaveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        fileContent={fileContent}
        filename={filename}
        contentType={contentType}
        onSuccess={(path) => {
          onSuccess?.(path);
        }}
        defaultFolder={defaultFolder}
        title={title}
        description={description}
      />
    </>
  );
}