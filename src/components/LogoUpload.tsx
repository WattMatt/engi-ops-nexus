import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface LogoUploadProps {
  currentUrl: string;
  onUrlChange: (url: string) => void;
  label: string;
  id: string;
}

export const LogoUpload = ({ currentUrl, onUrlChange, label, id }: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");
  const { toast } = useToast();

  // Update preview when currentUrl prop changes
  useEffect(() => {
    setPreview(currentUrl || "");
  }, [currentUrl]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("project-logos")
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUrlChange(publicUrl);

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview("");
    onUrlChange("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-4">
        {preview && preview.trim() !== "" ? (
          <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-contain bg-muted"
              onError={(e) => {
                console.error("Failed to load image:", preview);
                e.currentTarget.src = "";
                setPreview("");
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1">
          <div onClick={(e) => e.preventDefault()}>
            <Label htmlFor={`${id}-file`} className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Logo"}
              </div>
            </Label>
            <Input
              id={`${id}-file`}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-2">
              PNG, JPG up to 2MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
