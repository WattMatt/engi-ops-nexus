import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDefectPhotos, useUpdateDefectPhoto, DefectPhoto } from "@/hooks/useDefectPins";
import { useQueryClient } from "@tanstack/react-query";
import { useImageCompression } from "@/hooks/useImageCompression";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Loader2, X, PenTool } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pinId: string;
  projectId: string;
  uploaderName: string;
}

export function DefectPhotoUpload({ pinId, projectId, uploaderName }: Props) {
  const { data: photos, isLoading } = useDefectPhotos(pinId);
  const { compressImage, isCompressing } = useImageCompression();
  const updatePhoto = useUpdateDefectPhoto();
  const [uploading, setUploading] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<DefectPhoto | null>(null);
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
              {/* Annotation overlay indicator */}
              {photo.annotation_json && (
                <div className="absolute top-1 left-1 bg-red-500/80 rounded-full p-0.5">
                  <PenTool className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              {/* Annotate button */}
              <button
                onClick={() => setAnnotatingPhoto(photo)}
                className="absolute bottom-1 right-1 bg-background/80 border rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Annotate photo"
              >
                <PenTool className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No photos attached</p>
      )}

      {/* Photo Annotation Dialog */}
      {annotatingPhoto && (
        <PhotoAnnotationDialog
          photo={annotatingPhoto}
          imageUrl={getPublicUrl(annotatingPhoto.storage_path)}
          onClose={() => setAnnotatingPhoto(null)}
          onSave={(json) => {
            updatePhoto.mutate({
              id: annotatingPhoto.id,
              pin_id: pinId,
              annotation_json: json,
            });
            setAnnotatingPhoto(null);
          }}
        />
      )}
    </div>
  );
}

/** Fabric.js dialog for annotating a photo */
function PhotoAnnotationDialog({
  photo,
  imageUrl,
  onClose,
  onSave,
}: {
  photo: DefectPhoto;
  imageUrl: string;
  onClose: () => void;
  onSave: (json: any) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<"draw" | "circle" | "arrow">("draw");

  useEffect(() => {
    if (!canvasRef.current) return;
    let active = true;

    const initFabric = async () => {
      const { Canvas: FabricCanvas, FabricImage } = await import("fabric");
      if (!active || !canvasRef.current) return;

      const canvas = new FabricCanvas(canvasRef.current, {
        width: 640,
        height: 480,
        isDrawingMode: true,
        selection: false,
      });

      canvas.freeDrawingBrush.color = "#ef4444";
      canvas.freeDrawingBrush.width = 3;

      // Load background image
      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const scaleX = 640 / (img.width || 640);
        const scaleY = 480 / (img.height || 480);
        const imgScale = Math.min(scaleX, scaleY);
        img.scale(imgScale);
        img.set({ originX: "left", originY: "top" });
        canvas.backgroundImage = img;
        canvas.renderAll();
      } catch (err) {
        console.warn("Failed to load image for annotation:", err);
      }

      // Restore existing annotations
      if (photo.annotation_json) {
        try {
          await canvas.loadFromJSON(photo.annotation_json);
          canvas.renderAll();
        } catch (err) {
          console.warn("Failed to restore annotations:", err);
        }
      }

      fabricRef.current = canvas;
      setReady(true);
    };

    initFabric();

    return () => {
      active = false;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [imageUrl, photo.annotation_json]);

  const handleSave = () => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON();
    onSave(json);
  };

  const handleClear = () => {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects().forEach((obj: any) => {
      fabricRef.current.remove(obj);
    });
    fabricRef.current.renderAll();
  };

  const addCircle = useCallback(async () => {
    if (!fabricRef.current) return;
    const { Circle } = await import("fabric");
    const circle = new Circle({
      radius: 30,
      left: 100,
      top: 100,
      fill: "transparent",
      stroke: "#ef4444",
      strokeWidth: 3,
    });
    fabricRef.current.isDrawingMode = false;
    fabricRef.current.add(circle);
    fabricRef.current.setActiveObject(circle);
    fabricRef.current.renderAll();
  }, []);

  useEffect(() => {
    if (!fabricRef.current) return;
    if (tool === "draw") {
      fabricRef.current.isDrawingMode = true;
    } else if (tool === "circle") {
      addCircle();
      setTool("draw");
    }
  }, [tool, addCircle]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Annotate Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tool === "draw" ? "secondary" : "outline"}
              onClick={() => setTool("draw")}
            >
              <PenTool className="h-3.5 w-3.5 mr-1" /> Draw
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTool("circle")}
            >
              ⭕ Circle
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            <canvas ref={canvasRef} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!ready}>Save Annotation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
