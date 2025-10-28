import React, { forwardRef, useImperativeHandle } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Tool, EquipmentItem, SupplyLine, SupplyZone, Containment, RoofMask, PVArrayItem, ScaleInfo, ViewState, Point, ContainmentType, PVPanelConfig, Task } from '@/types/floor-plan';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';

interface CanvasProps {
  pdfDoc: PDFDocumentProxy | null;
  activeTool: Tool;
  equipment: EquipmentItem[];
  setEquipment: (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit?: boolean) => void;
  lines: SupplyLine[];
  setLines: (updater: (prev: SupplyLine[]) => SupplyLine[], commit?: boolean) => void;
  zones: SupplyZone[];
  setZones: (updater: (prev: SupplyZone[]) => SupplyZone[], commit?: boolean) => void;
  containment: Containment[];
  setContainment: (updater: (prev: Containment[]) => Containment[], commit?: boolean) => void;
  roofMasks: RoofMask[];
  setRoofMasks: (updater: (prev: RoofMask[]) => RoofMask[], commit?: boolean) => void;
  pvArrays: PVArrayItem[];
  setPvArrays: (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit?: boolean) => void;
  scaleInfo: ScaleInfo | null;
  viewState: ViewState;
  setViewState: (state: ViewState) => void;
  initialViewState: ViewState | null;
  setInitialViewState: (state: ViewState | null) => void;
  onScaleLineDrawn: (start: Point, end: Point) => void;
  onCableDrawn: (points: Point[], length: number) => void;
  onContainmentDrawn: (type: ContainmentType, points: Point[], length: number) => void;
  onRoofMaskDrawn: (points: Point[]) => void;
  onPvArrayPlacement: (x: number, y: number, roofId: string) => void;
  pvPanelConfig: PVPanelConfig | null;
  purposeConfig: PurposeConfig | null;
  tasks: Task[];
  onCreateTask?: (itemType: string, itemId: string) => void;
  onEditTask?: (task: Task) => void;
}

export interface CanvasHandles {
  setEquipmentType: (type: string) => void;
}

const Canvas = forwardRef<CanvasHandles, CanvasProps>((props, ref) => {
  useImperativeHandle(ref, () => ({
    setEquipmentType: (type: string) => {
      console.log('Setting equipment type:', type);
    },
  }));

  return (
    <div className="flex-1 bg-gray-900 relative">
      <canvas className="w-full h-full" />
      <div className="absolute top-4 left-4 text-white">Canvas Placeholder</div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;