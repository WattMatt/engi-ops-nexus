import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDefectPhotos, useUpdateDefectPhoto, DefectPhoto } from "@/hooks/useDefectPins";
import { useOfflinePhotoQueue } from "@/hooks/useOfflinePhotoQueue";
import { getQueuedPhotoPreviewUrl, type QueuedPhoto } from "@/utils/offlinePhotoQueue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, PenTool, WifiOff, CloudUpload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pinId: string;
  projectId: string;
  uploaderName: string;
}

export function DefectPhotoUpload({ pinId, projectId, uploaderName }: Props) {
  const { data: photos, isLoading } = useDefectPhotos(pinId);
  const updatePhoto = useUpdateDefectPhoto();
  const [annotatingPhoto, setAnnotatingPhoto] = useState<DefectPhoto | null>(null);

  const {
    addPhoto,
    queuedPhotos,
    pendingCount,
    isSyncing,
    isCompressing,
    isConnected,
  } = useOfflinePhotoQueue({ pinId, projectId, uploaderName });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await addPhoto(file);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("defect-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const busy = uploading || isCompressing;

  return (
    <div className="space-y-3">
      {/* Upload button + connectivity indicator */}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
          <Button variant="outline" size="sm" asChild disabled={busy}>
            <span>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Add Photo
            </span>
          </Button>
        </label>

        {!isConnected && (
          <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        )}

        {isSyncing && (
          <Badge variant="outline" className="text-blue-600 border-blue-300 gap-1">
            <CloudUpload className="h-3 w-3 animate-pulse" />
            Syncing…
          </Badge>
        )}

        {pendingCount > 0 && !isSyncing && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
            <AlertCircle className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Photo grid */}
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {/* Synced / server photos */}
          {photos?.map((photo) => (
            <SyncedPhotoTile
              key={photo.id}
              photo={photo}
              imageUrl={getPublicUrl(photo.storage_path)}
              onAnnotate={() => setAnnotatingPhoto(photo)}
            />
          ))}

          {/* Queued / offline photos */}
          {queuedPhotos.map((qp) => (
            <QueuedPhotoTile key={qp.id} entry={qp} />
          ))}

          {(!photos || photos.length === 0) && queuedPhotos.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-3">No photos attached</p>
          )}
        </div>
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

// ── Synced photo tile ──────────────────────────────────────────────

function SyncedPhotoTile({
  photo,
  imageUrl,
  onAnnotate,
}: {
  photo: DefectPhoto;
  imageUrl: string;
  onAnnotate: () => void;
}) {
  return (
    <div className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
      <img
        src={imageUrl}
        alt={photo.file_name || "Status photo"}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Synced badge */}
      <div className="absolute top-1 right-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 drop-shadow" />
      </div>
      {/* Annotation indicator */}
      {photo.annotation_json && (
        <div className="absolute top-1 left-1 bg-red-500/80 rounded-full p-0.5">
          <PenTool className="h-2.5 w-2.5 text-white" />
        </div>
      )}
      {/* Annotate button */}
      <button
        onClick={onAnnotate}
        className="absolute bottom-1 right-1 bg-background/80 border rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Annotate photo"
      >
        <PenTool className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Queued (offline) photo tile ────────────────────────────────────

function QueuedPhotoTile({ entry }: { entry: QueuedPhoto }) {
  const previewUrl = getQueuedPhotoPreviewUrl(entry);
  const statusIcon =
    entry.status === 'uploading' ? (
      <CloudUpload className="h-3.5 w-3.5 text-blue-500 animate-pulse drop-shadow" />
    ) : entry.status === 'failed' ? (
      <AlertCircle className="h-3.5 w-3.5 text-red-500 drop-shadow" />
    ) : (
      <WifiOff className="h-3.5 w-3.5 text-amber-500 drop-shadow" />
    );

  return (
    <div className="relative aspect-square rounded-md overflow-hidden border bg-muted border-dashed border-amber-400/60">
      <img
        src={previewUrl}
        alt={entry.file_name}
        className="w-full h-full object-cover opacity-80"
      />
      {/* Status badge */}
      <div className="absolute top-1 right-1">{statusIcon}</div>
      {/* Offline label */}
      <div className="absolute bottom-0 inset-x-0 bg-amber-500/80 text-white text-[10px] text-center py-0.5 font-medium">
        {entry.status === 'failed' ? 'Retry pending' : 'Queued offline'}
      </div>
    </div>
  );
}

// ── Photo Annotation Dialog (fabric.js) ────────────────────────────

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
  const [tool, setTool] = useState<"draw" | "circle">("draw");

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

      try {
        const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const scaleX = 640 / (img.width || 640);
        const scaleY = 480 / (img.height || 480);
        img.scale(Math.min(scaleX, scaleY));
        img.set({ originX: "left", originY: "top" });
        canvas.backgroundImage = img;
        canvas.renderAll();
      } catch (err) {
        console.warn("Failed to load image for annotation:", err);
      }

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
    onSave(fabricRef.current.toJSON());
  };

  const handleClear = () => {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects().forEach((obj: any) => fabricRef.current.remove(obj));
    fabricRef.current.renderAll();
  };

  const addCircle = useCallback(async () => {
    if (!fabricRef.current) return;
    const { Circle } = await import("fabric");
    const circle = new Circle({
      radius: 30, left: 100, top: 100,
      fill: "transparent", stroke: "#ef4444", strokeWidth: 3,
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
            <Button size="sm" variant={tool === "draw" ? "secondary" : "outline"} onClick={() => setTool("draw")}>
              <PenTool className="h-3.5 w-3.5 mr-1" /> Draw
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTool("circle")}>
              ⭕ Circle
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>Clear</Button>
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
