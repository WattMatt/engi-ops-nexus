import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDefectPhotos } from "@/hooks/useDefectPins";
import { useQueryClient } from "@tanstack/react-query";
import { useImageCompression } from "@/hooks/useImageCompression";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pinId: string;
  projectId: string;
  uploaderName: string;
}

export function DefectPhotoUpload({ pinId, projectId, uploaderName }: Props) {
  const { data: photos, isLoading } = useDefectPhotos(pinId);
  const { compressImage, isCompressing } = useImageCompression();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${projectId}/${pinId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("defect-photos")
        .upload(path, compressed);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("defect_photos").insert({
        pin_id: pinId,
        storage_path: path,
        file_name: file.name,
        file_size: compressed.size,
        uploaded_by_name: uploaderName,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["defect-photos", pinId] });
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("defect-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" asChild disabled={uploading || isCompressing}>
            <span>
              {uploading || isCompressing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Add Photo
            </span>
          </Button>
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : photos && photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img
                src={getPublicUrl(photo.storage_path)}
                alt={photo.file_name || "Defect photo"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No photos attached</p>
      )}
    </div>
  );
}
