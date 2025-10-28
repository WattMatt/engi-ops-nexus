import { Button } from "@/components/ui/button";
import {
  Upload,
  Save,
  FolderOpen,
  MousePointer,
  Lightbulb,
  Cable,
  Square,
  Ruler,
} from "lucide-react";
import { ToolMode } from "./FloorPlanApp";

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  onUploadPdf: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onLoad: () => void;
  onSetScale: () => void;
  hasScale: boolean;
  hasPdf: boolean;
}

export function Toolbar({
  tool,
  onToolChange,
  onUploadPdf,
  onSave,
  onLoad,
  onSetScale,
  hasScale,
  hasPdf,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* File Operations */}
      <Button variant="outline" size="sm" asChild>
        <label className="cursor-pointer">
          <Upload className="h-4 w-4 mr-2" />
          Upload PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={onUploadPdf}
            className="hidden"
          />
        </label>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onLoad}
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        Load Design
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={!hasPdf}
      >
        <Save className="h-4 w-4 mr-2" />
        Save Design
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      {/* Scale */}
      <Button
        variant={hasScale ? "outline" : "default"}
        size="sm"
        onClick={onSetScale}
        disabled={!hasPdf}
      >
        <Ruler className="h-4 w-4 mr-2" />
        {hasScale ? "Scale Set" : "Set Scale"}
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      {/* Tools */}
      <Button
        variant={tool === "select" ? "default" : "outline"}
        size="sm"
        onClick={() => onToolChange("select")}
      >
        <MousePointer className="h-4 w-4 mr-2" />
        Select
      </Button>

      <Button
        variant={tool === "equipment" ? "default" : "outline"}
        size="sm"
        onClick={() => onToolChange("equipment")}
        disabled={!hasPdf}
      >
        <Lightbulb className="h-4 w-4 mr-2" />
        Equipment
      </Button>

      <Button
        variant={tool === "cable" ? "default" : "outline"}
        size="sm"
        onClick={() => onToolChange("cable")}
        disabled={!hasPdf}
      >
        <Cable className="h-4 w-4 mr-2" />
        Cable
      </Button>

      <Button
        variant={tool === "zone" ? "default" : "outline"}
        size="sm"
        onClick={() => onToolChange("zone")}
        disabled={!hasPdf}
      >
        <Square className="h-4 w-4 mr-2" />
        Zone
      </Button>
    </div>
  );
}
