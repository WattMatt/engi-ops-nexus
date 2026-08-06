/**
 * Shared in-app preview dialog for the SVG→PDF pipeline (standard F2:
 * "in-app preview before save for documents that are deliverables").
 *
 * Renders the SVG pages produced by useSvgPdfReport directly in the DOM
 * (no rasterization, no react-pdf) with page navigation and zoom.
 * Confirm continues the pipeline (download + upload + history record);
 * Cancel aborts it — nothing is downloaded or persisted.
 *
 * Wire-up (opt-in per entry point via `preview: true` in the persist config):
 *
 *   const { svgPages, showPreview, confirmPreview, cancelPreview, ... } = useSvgPdfReport();
 *   await generateAndPersist(buildFn, { ...config, preview: true });
 *   <SvgPdfPreviewDialog
 *     open={showPreview}
 *     svgPages={svgPages}
 *     fileName={reportName}
 *     onConfirm={confirmPreview}
 *     onCancel={cancelPreview}
 *   />
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 25;

interface SvgPdfPreviewDialogProps {
  open: boolean;
  svgPages: SVGSVGElement[];
  /** Display name of the document being previewed. */
  fileName?: string;
  /** Continue the pipeline: convert, download, and save the report. */
  onConfirm: () => void;
  /** Abort the pipeline: no download, no persistence. */
  onCancel: () => void;
}

export function SvgPdfPreviewDialog({
  open,
  svgPages,
  fileName,
  onConfirm,
  onCancel,
}: SvgPdfPreviewDialogProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const pageHostRef = useRef<HTMLDivElement>(null);

  // Reset navigation whenever a new preview opens
  useEffect(() => {
    if (open) {
      setPageIndex(0);
      setZoom(100);
    }
  }, [open]);

  // Mount a clone of the current SVG page into the host div.
  // Clones keep the source elements untouched for the PDF conversion step.
  useEffect(() => {
    const host = pageHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    const page = svgPages[pageIndex];
    if (!page) return;
    const clone = page.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.style.width = "100%";
    clone.style.height = "auto";
    clone.style.display = "block";
    host.appendChild(clone);
    return () => {
      host.innerHTML = "";
    };
  }, [svgPages, pageIndex, open]);

  const total = svgPages.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[360px]">
              Preview{fileName ? `: ${fileName}` : ""}
            </span>
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
              Not saved yet
            </span>
          </DialogTitle>
          <DialogDescription>
            Review the report pages below, then download &amp; save — or cancel to
            discard without generating anything.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-lg border bg-muted flex flex-col items-center p-4 min-h-0">
          <div
            className="bg-white shadow-lg shrink-0"
            style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? "800px" : undefined }}
          >
            <div ref={pageHostRef} aria-label={`Report page ${pageIndex + 1} of ${total}`} />
          </div>

          <div className="flex items-center gap-3 mt-4 p-2 bg-background rounded-lg border sticky bottom-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium whitespace-nowrap">
              Page {Math.min(pageIndex + 1, total)} of {total}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.min(total - 1, p + 1))}
              disabled={pageIndex >= total - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              disabled={zoom <= ZOOM_MIN}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              disabled={zoom >= ZOOM_MAX}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Check className="h-4 w-4 mr-2" />
            Download &amp; Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
