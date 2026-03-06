import { useState, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { DefectPin } from "@/hooks/useDefectPins";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Crosshair, Loader2, Move } from "lucide-react";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  pdfUrl: string;
  pins: DefectPin[];
  addMode: boolean;
  relocateMode: boolean;
  onAddPin: (coords: { x: number; y: number }) => void;
  onPinClick: (pin: DefectPin) => void;
  onPinRelocate: (pin: DefectPin, coords: { x: number; y: number }) => void;
  selectedPinId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-red-500 drop-shadow-[0_1px_2px_rgba(239,68,68,0.5)]",
  in_progress: "text-orange-500 drop-shadow-[0_1px_2px_rgba(249,115,22,0.5)]",
  resolved: "text-blue-500 drop-shadow-[0_1px_2px_rgba(59,130,246,0.5)]",
  closed: "text-green-500 drop-shadow-[0_1px_2px_rgba(34,197,94,0.5)]",
};

export function DefectDrawingViewer({
  pdfUrl,
  pins,
  addMode,
  relocateMode,
  onAddPin,
  onPinClick,
  onPinRelocate,
  selectedPinId,
}: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [draggingPin, setDraggingPin] = useState<DefectPin | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const getCoordsFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPin) return; // handled by mouseup
    if (addMode) {
      onAddPin(getCoordsFromEvent(e));
    }
  };

  const handlePinMouseDown = (e: React.MouseEvent, pin: DefectPin) => {
    e.stopPropagation();
    if (relocateMode) {
      e.preventDefault();
      setDraggingPin(pin);
      setDragPreview({ x: pin.x_percent, y: pin.y_percent });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingPin) return;
    setDragPreview(getCoordsFromEvent(e));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingPin || !dragPreview) return;
    const coords = getCoordsFromEvent(e);
    onPinRelocate(draggingPin, coords);
    setDraggingPin(null);
    setDragPreview(null);
  };

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(3, s + 0.25))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScale(1)}>
          <RotateCcw className="h-4 w-4" />
        </Button>

        {numPages > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage}/{numPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}

        {addMode && (
          <div className="flex items-center gap-1 ml-auto text-xs text-orange-600 font-medium">
            <Crosshair className="h-3.5 w-3.5" />
            Click on drawing to place pin
          </div>
        )}
        {relocateMode && !addMode && (
          <div className="flex items-center gap-1 ml-auto text-xs text-blue-600 font-medium">
            <Move className="h-3.5 w-3.5" />
            Drag a pin to relocate it
          </div>
        )}
      </div>

      {/* PDF + Pin overlay */}
      <div className="border rounded-lg overflow-auto bg-muted/30 max-h-[600px]">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "relative inline-block",
            addMode && "cursor-crosshair",
            relocateMode && !addMode && "cursor-grab"
          )}
          onClick={handleContainerClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoad} loading={null}>
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {/* Pin overlays */}
          {pins.map((pin) => {
            const isDragging = draggingPin?.id === pin.id;
            const displayX = isDragging && dragPreview ? dragPreview.x : pin.x_percent;
            const displayY = isDragging && dragPreview ? dragPreview.y : pin.y_percent;

            return (
              <button
                key={pin.id}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-full transition-transform z-10",
                  !isDragging && "hover:scale-125",
                  selectedPinId === pin.id && "scale-125",
                  isDragging && "scale-150 opacity-70 cursor-grabbing",
                  relocateMode && !addMode && "cursor-grab"
                )}
                style={{
                  left: `${displayX}%`,
                  top: `${displayY}%`,
                  transition: isDragging ? "none" : undefined,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!relocateMode) onPinClick(pin);
                }}
                onMouseDown={(e) => handlePinMouseDown(e, pin)}
                title={`#${pin.number_id}: ${pin.title}`}
              >
                <MapPin className={cn("h-6 w-6", STATUS_COLORS[pin.status])} fill="currentColor" fillOpacity={0.2} />
                <span className="absolute -top-1 -right-1 bg-background border rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                  {pin.number_id}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}