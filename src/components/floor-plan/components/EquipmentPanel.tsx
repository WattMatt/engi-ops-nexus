
import React, { useState, useMemo } from 'react';
import { Layers, LayoutGrid, PlusCircle, CheckCircle, Clock, Circle, ChevronDown, Box, CircuitBoard, Zap, Package, ChevronRight, Trash2, Edit, Plus, Sparkles, FileText, Settings2, Eye, MapPin, X } from 'lucide-react';
import { EquipmentItem, SupplyLine, SupplyZone, Containment, EquipmentType, DesignPurpose, PVPanelConfig, PVArrayItem, Task, TaskStatus, ScaleInfo, RoofMask } from '../types';
import { PurposeConfig } from '../purpose.config';
import { EquipmentIcon } from './EquipmentIcon';
import { getCableColor, getContainmentStyle, calculateLvCableSummary } from '../utils/styleUtils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CableRoute3DModal } from '@/components/cable-route/CableRoute3DModal';
import { FloorPlan3DDialog } from './FloorPlan3DDialog';
import { convertSupplyLinesToCableRoutes } from '@/components/cable-route/utils/routeConverter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDistributionBoards,
  useDbCircuits,
  useCircuitMaterials,
  useDeleteCircuitMaterial,
  useReassignCircuitMaterial,
  useCreateDistributionBoard,
  useCreateCircuit,
  useDeleteCircuit,
  DbCircuit,
} from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircuitAssignmentSelector } from './CircuitAssignmentSelector';
import { CircuitTemplatesDialog } from './CircuitTemplatesDialog';
import { AssemblyInspector } from './AssemblyInspector';
import { BulkAssemblyEditor } from './BulkAssemblyEditor';
import { AssembliesTab } from './AssembliesTab';
import { AssemblyModification } from '../types';

interface EquipmentPanelProps {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onEquipmentUpdate: (item: EquipmentItem) => void;
  onZoneUpdate: (item: SupplyZone) => void;
  onDeleteItem: () => void;
  purposeConfig: PurposeConfig | null;
  designPurpose: DesignPurpose | null;
  // PV Props
  pvPanelConfig: PVPanelConfig | null;
  pvArrays: PVArrayItem[];
  modulesPerString: number;
  onModulesPerStringChange: (value: number) => void;
  // Task Props
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
  // Zones Props
  onJumpToZone: (zone: SupplyZone) => void;
  // Roof Masks Props
  roofMasks?: RoofMask[];
  onJumpToRoofMask?: (mask: RoofMask) => void;
  onRoofMaskUpdate?: (mask: RoofMask) => void;
  // Project ID
  projectId?: string;
  // Floor Plan ID for grouping unassigned materials per layout/shop
  floorPlanId?: string;
  // Scale Info for 3D conversion
  scaleInfo?: ScaleInfo | null;
  // Circuit Schedule Props
  selectedCircuit?: DbCircuit | null;
  onSelectCircuit?: (circuit: DbCircuit | null) => void;
  // Cable editing
  onEditCable?: (cable: SupplyLine) => void;
  // AI Scan Props
  onStartRegionSelect?: () => void;
  isSelectingRegion?: boolean;
}

type EquipmentPanelTab = 'summary' | 'equipment' | 'assemblies' | 'cables' | 'containment' | 'zones' | 'roofMasks' | 'tasks';
type TopLevelView = 'overview' | 'circuits';


const ItemTasks: React.FC<{
  itemId: string;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ itemId, tasks, onOpenTaskModal }) => {
  const itemTasks = useMemo(() => tasks.filter(t => t.linkedItemId === itemId), [tasks, itemId]);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-foreground">Tasks ({itemTasks.length})</h4>
        <button
          onClick={() => onOpenTaskModal({ linkedItemId: itemId, status: TaskStatus.TODO })}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <PlusCircle size={14} /> Add Task
        </button>
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
        {itemTasks.length > 0 ? itemTasks.map(task => (
          <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-muted p-2 rounded-md text-xs hover:bg-accent transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground truncate">{task.title}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                  'bg-muted-foreground/20 text-muted-foreground'
                }`}>{task.status}</span>
            </div>
          </button>
        )) : (
          <p className="text-muted-foreground text-xs text-center py-2">No tasks for this item.</p>
        )}
      </div>
    </div>
  );
};


const SelectionDetails: React.FC<{
  item: EquipmentItem;
  onUpdate: (item: EquipmentItem) => void;
  onDelete: () => void;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ item, onUpdate, onDelete, tasks, onOpenTaskModal }) => {
  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selection Details</h3>
      <div className='flex items-center gap-3 mb-3'>
        <EquipmentIcon type={item.type} className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <span className="text-foreground font-bold">{item.type}</span>
      </div>
      <div>
        <label htmlFor="equipmentName" className="block text-sm font-medium text-foreground mb-1">
          Equipment Name
        </label>
        <input
          type="text"
          id="equipmentName"
          value={item.name || ''}
          onChange={(e) => onUpdate({ ...item, name: e.target.value })}
          className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
          placeholder="e.g., DB-GF-01"
        />
      </div>

      <div className="mt-4 mb-4">
        <AssemblyInspector item={item} onUpdate={onUpdate} />
      </div>

      <ItemTasks itemId={item.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />
      <div className="mt-4">
        <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors">
          Delete Item
        </button>
      </div>
    </div>
  );
}


const ZoneDetails: React.FC<{
  item: SupplyZone;
  onUpdate: (item: SupplyZone) => void;
  onDelete: () => void;
  onDeselect: () => void;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
}> = ({ item, onUpdate, onDelete, onDeselect, tasks, onOpenTaskModal }) => {
  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Exclusion Zone Details</h3>
        <button
          onClick={onDeselect}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="Close details"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
      <div className='flex items-center gap-3 mb-3'>
        <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: item.color }} />
        <span className="text-foreground font-bold">Exclusion Zone</span>
      </div>
      
      {/* Area Display */}
      <div className="text-sm text-foreground mb-3 bg-background/50 p-2 rounded-md">
        <div className="flex justify-between items-center">
          <span>Area:</span>
          <span className="font-mono font-bold text-yellow-400">
            {item.area > 0 ? `${item.area.toFixed(2)} m²` : '--'}
          </span>
        </div>
      </div>
      
      <div>
        <label htmlFor="zoneName" className="block text-sm font-medium text-foreground mb-1">
          Zone Name
        </label>
        <input
          type="text"
          id="zoneName"
          value={item.name || ''}
          onChange={(e) => onUpdate({ ...item, name: e.target.value })}
          className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring text-sm"
          placeholder="e.g., No-Go Area"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
      </div>
      <ItemTasks itemId={item.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />
      <div className="mt-4">
        <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors">
          Delete Zone
        </button>
      </div>
    </div>
  )
}

// Roof Mask Details Component
const RoofMaskDetails: React.FC<{
  item: RoofMask;
  onUpdate: (item: RoofMask) => void;
  onDelete: () => void;
  onDeselect: () => void;
}> = ({ item, onUpdate, onDelete, onDeselect }) => {
  const getDirectionLabel = (degrees: number): string => {
    if (degrees >= 337.5 || degrees < 22.5) return 'N';
    if (degrees >= 22.5 && degrees < 67.5) return 'NE';
    if (degrees >= 67.5 && degrees < 112.5) return 'E';
    if (degrees >= 112.5 && degrees < 157.5) return 'SE';
    if (degrees >= 157.5 && degrees < 202.5) return 'S';
    if (degrees >= 202.5 && degrees < 247.5) return 'SW';
    if (degrees >= 247.5 && degrees < 292.5) return 'W';
    return 'NW';
  };
  
  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roof Mask Details</h3>
        <button
          onClick={onDeselect}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="Close details"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: 'rgba(148, 112, 216, 0.6)' }} />
        <span className="text-foreground font-bold">Roof Mask</span>
      </div>
      
      {/* Area Display */}
      <div className="text-sm text-foreground mb-4 bg-background/50 p-2 rounded-md">
        <div className="flex justify-between items-center">
          <span>Area:</span>
          <span className="font-mono font-bold text-purple-400">
            {item.area ? `${item.area.toFixed(2)} m²` : '--'}
          </span>
        </div>
      </div>
      
      {/* Editable Pitch */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-foreground mb-1">
          Pitch (degrees)
        </label>
        <input
          type="number"
          value={item.pitch}
          onChange={(e) => onUpdate({ ...item, pitch: parseFloat(e.target.value) || 0 })}
          min="0"
          max="90"
          step="1"
          className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      
      {/* Editable Direction */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-foreground mb-1">
          Direction / Azimuth (degrees)
        </label>
        <input
          type="number"
          value={item.direction}
          onChange={(e) => onUpdate({ ...item, direction: parseFloat(e.target.value) || 0 })}
          min="0"
          max="360"
          step="1"
          className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">
          0° = North ({getDirectionLabel(item.direction)})
        </p>
      </div>
      
      {/* Delete Button */}
      <div className="mt-4">
        <button
          onClick={onDelete}
          className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors"
        >
          Delete Roof Mask
        </button>
      </div>
    </div>
  );
}

const PvArrayDetails: React.FC<{
  item: PVArrayItem;
  pvPanelConfig: PVPanelConfig | null;
  onDelete: () => void;
}> = ({ item, pvPanelConfig, onDelete }) => {
  const totalPanels = item.rows * item.columns;
  const totalWattage = pvPanelConfig ? totalPanels * pvPanelConfig.wattage : 0;
  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selection Details</h3>
      <div className='flex items-center gap-3 mb-3'>
        <LayoutGrid className="h-5 w-5 text-sky-400 flex-shrink-0" />
        <span className="text-foreground font-bold">PV Array</span>
      </div>
      <div className="text-sm text-foreground space-y-1">
        <div className="flex justify-between"><span>Layout:</span> <span className='font-mono'>{item.rows} rows &times; {item.columns} cols</span></div>
        <div className="flex justify-between"><span>Orientation:</span> <span className='font-mono capitalize'>{item.orientation}</span></div>
        <div className="flex justify-between"><span>Total Panels:</span> <span className='font-mono'>{totalPanels}</span></div>
        {pvPanelConfig && <div className="flex justify-between"><span>Total Power:</span> <span className='font-mono'>{(totalWattage / 1000).toFixed(2)} kWp</span></div>}
      </div>
      <div className="mt-4">
        <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors">
          Delete Array
        </button>
      </div>
    </div>
  );
};

const CableDetails: React.FC<{
  item: SupplyLine;
  onDelete: () => void;
  onEdit?: () => void;
  tasks: Task[];
  onOpenTaskModal: (task: Partial<Task> | null) => void;
  projectId?: string;
  floorPlanId?: string;
  currentCircuitId?: string | null;
  materialId?: string;
}> = ({ item, onDelete, onEdit, tasks, onOpenTaskModal, projectId, floorPlanId, currentCircuitId, materialId }) => {
  const isGpWire = item.cableType?.toUpperCase().includes('GP');
  // For GP wire: pathLength is the horizontal trace, we triple it for L+E+N conductors
  const pathLength = item.pathLength ?? item.length;
  const startH = item.startHeight ?? 0;
  const endH = item.endHeight ?? 0;

  // GP wire: path × 3 (for 3 conductors) + drops/rises (not multiplied)
  const calculatedLength = isGpWire
    ? (pathLength * 3) + startH + endH
    : item.length;

  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cable Details</h3>
      <div className='flex items-center gap-3 mb-3'>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.cableType ? getCableColor(item.cableType) : '#6B7280' }}></div>
        <span className="text-foreground font-bold">{item.cableType || 'Cable'}</span>
      </div>
      <div className="space-y-2 text-sm text-foreground">
        <div className="flex justify-between">
          <span>From:</span>
          <span className='font-mono'>{item.from || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>To:</span>
          <span className='font-mono'>{item.to || 'N/A'}</span>
        </div>
        {item.label && (
          <div className="flex justify-between">
            <span>Label:</span>
            <span className='font-mono'>{item.label}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Length:</span>
          <span className='font-mono font-semibold text-primary'>{calculatedLength.toFixed(2)}m</span>
        </div>
        {isGpWire && (
          <div className="text-xs text-muted-foreground bg-primary/10 rounded px-2 py-1 mt-1">
            {pathLength.toFixed(2)}m × 3 (L+E+N){(startH > 0 || endH > 0) ? ` + ${(startH + endH).toFixed(2)}m drops` : ''}
          </div>
        )}
        {item.terminationCount && item.terminationCount > 0 && (
          <div className="flex justify-between">
            <span>Terminations:</span>
            <span className='font-mono'>{item.terminationCount}x</span>
          </div>
        )}
        {(startH > 0 || endH > 0) && !isGpWire && (
          <div className="flex justify-between">
            <span>Rise/Drop:</span>
            <span className='font-mono text-xs'>
              {startH.toFixed(1)}m / {endH.toFixed(1)}m
            </span>
          </div>
        )}
      </div>

      {/* Circuit Assignment Selector */}
      {projectId && (
        <CircuitAssignmentSelector
          projectId={projectId}
          floorPlanId={floorPlanId}
          currentCircuitId={currentCircuitId}
          materialId={materialId}
          materialDetails={!materialId ? {
            description: `${item.cableType || 'Cable'} - ${item.from || 'Unknown'} to ${item.to || 'Unknown'}`,
            quantity: calculatedLength,
            unit: 'm',
            canvas_line_id: item.id,
          } : undefined}
        />
      )}

      <ItemTasks itemId={item.id} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />
      <div className="mt-4 flex gap-2">
        {onEdit && (
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 text-primary hover:bg-primary/40 rounded-md text-sm font-semibold transition-colors">
            <Edit className="h-4 w-4" />
            Edit
          </button>
        )}
        <button onClick={onDelete} className={cn("text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors", onEdit ? "flex-1" : "w-full")}>
          Delete Cable
        </button>
      </div>
    </div>
  );
};

const ContainmentDetails: React.FC<{
  item: Containment;
  onDelete: () => void;
  projectId?: string;
  floorPlanId?: string;
  currentCircuitId?: string | null;
  materialId?: string;
}> = ({ item, onDelete, projectId, floorPlanId, currentCircuitId, materialId }) => {
  const style = getContainmentStyle(item.type, item.size);

  return (
    <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Containment Details</h3>
      <div className='flex items-center gap-3 mb-3'>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: style.color }}></div>
        <span className="text-foreground font-bold">{item.type}</span>
      </div>
      <div className="space-y-2 text-sm text-foreground">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className='font-mono'>{item.type}</span>
        </div>
        <div className="flex justify-between">
          <span>Size:</span>
          <span className='font-mono'>{item.size}</span>
        </div>
        <div className="flex justify-between">
          <span>Length:</span>
          <span className='font-mono font-semibold text-primary'>{item.length.toFixed(2)}m</span>
        </div>
      </div>

      {/* Circuit Assignment Selector */}
      {projectId && (
        <CircuitAssignmentSelector
          projectId={projectId}
          floorPlanId={floorPlanId}
          currentCircuitId={currentCircuitId}
          materialId={materialId}
          materialDetails={!materialId ? {
            description: `${item.type} ${item.size}`,
            quantity: item.length,
            unit: 'm',
            canvas_line_id: item.id,
          } : undefined}
        />
      )}

      <div className="mt-4">
        <button onClick={onDelete} className="w-full text-center px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-md text-sm font-semibold transition-colors">
          Delete Containment
        </button>
      </div>
    </div>
  );
};

const DetailedCableSchedule: React.FC<{ lines: SupplyLine[] }> = ({ lines }) => {
  const lvLines = useMemo(() => lines.filter(l => l.type === 'lv'), [lines]);

  if (lvLines.length === 0) {
    return <p className="text-gray-500 text-xs p-4 text-center">No LV/AC cables drawn.</p>;
  }

  return (
    <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-2">
      {lvLines.map(line => {
        const isGpWire = line.cableType?.includes('GP');
        const pathLen = line.pathLength ?? line.length;
        const startH = line.startHeight ?? 0;
        const endH = line.endHeight ?? 0;

        const calculatedLength = isGpWire ? (pathLen * 3) + startH + endH : line.length;
        let lengthBreakdown = '';

        if (line.pathLength !== undefined) {
          if (isGpWire) {
            lengthBreakdown = `(${(pathLen).toFixed(2)}m×3 + ${startH}m + ${endH}m)`;
          } else {
            lengthBreakdown = `(${(pathLen).toFixed(2)}m + ${startH}m + ${endH}m)`;
          }
        } else if (isGpWire) {
          lengthBreakdown = `(${line.length.toFixed(2)}m×3)`;
        }

        return (
          <div key={line.id} className="bg-gray-700/50 p-2 rounded-md text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.cableType ? getCableColor(line.cableType) : 'gray' }}></div>
                <span className="font-bold text-gray-200">{line.cableType || 'N/A'}</span>
                {line.cableEntryId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-900/30 text-green-400 border border-green-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Linked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {line.terminationCount && line.terminationCount > 0 && <span className="font-mono text-amber-400">{line.terminationCount}x Term.</span>}
                <span className="font-mono text-gray-300">
                  {calculatedLength.toFixed(2)}m
                  {lengthBreakdown && <span className="text-gray-500 text-[10px] ml-1">{lengthBreakdown}</span>}
                </span>
              </div>
            </div>
            <div className="text-gray-400 mt-1 pl-5">
              <span className="font-semibold">From:</span> {line.from} &rarr; <span className="font-semibold">To:</span> {line.to}
            </div>
          </div>
        )
      })}
    </div>
  );
};


const LvCableSummary: React.FC<{ lines: SupplyLine[] }> = ({ lines }) => {
  const { lvLines, cableSummary, terminationSummary } = useMemo(() => {
    const lvLines = lines.filter(l => l.type === 'lv');
    const { summary, terminationSummary } = calculateLvCableSummary(lvLines);
    return { lvLines, cableSummary: Array.from(summary.entries()), terminationSummary: Array.from(terminationSummary.entries()) };
  }, [lines]);

  if (lvLines.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">LV/AC Cable Summary</h3>
        <div className="space-y-1.5 text-sm">
          {cableSummary.length > 0 ? cableSummary.map(([type, { totalLength, color }]) => (
            <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-gray-300 text-xs">{type}</span>
              </div>
              <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span>
            </div>
          )) : <p className="text-gray-500 text-xs">No cables to summarize.</p>}
        </div>
      </div>

      {terminationSummary.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Termination Summary</h3>
          <div className="space-y-1.5 text-sm">
            {terminationSummary.map(([type, count]) => (
              <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getCableColor(type) }}></div>
                  <span className="text-gray-300 text-xs">{type}</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{count}x Terminations</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const ZoneSummary: React.FC<{ zones: SupplyZone[] }> = ({ zones }) => {
  const totalZoneArea = useMemo(() => zones.reduce((sum, z) => sum + z.area, 0), [zones]);

  if (zones.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Zone Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="bg-gray-700/50 p-2 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-yellow-400">Total Zones</span>
            <span className="font-mono font-bold text-yellow-400">{zones.length}</span>
          </div>
        </div>
        <div className="bg-gray-700/50 p-2 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-yellow-400">Total Zoned Area</span>
            <span className="font-mono font-bold text-yellow-400">{totalZoneArea.toFixed(2)}m²</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BudgetMarkupSummary: React.FC<{ lines: SupplyLine[], zones: SupplyZone[] }> = ({ lines, zones }) => {
  const { mvLines, mvTotalLength } = useMemo(() => {
    const mvLines = lines.filter(l => l.type === 'mv');
    const mvTotalLength = mvLines.reduce((sum, l) => sum + l.length, 0);
    return { mvLines, mvTotalLength };
  }, [lines]);

  return (
    <>
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">MV Supply Routes</h3>
        <div className="space-y-2 text-sm">
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-red-400">MV Cable Total</span>
              <span className="font-mono font-bold text-red-400">{mvTotalLength.toFixed(2)}m</span>
            </div>
          </div>
        </div>
      </div>
      <LvCableSummary lines={lines} />
      <ZoneSummary zones={zones} />
    </>
  );
};

const LineShopSummary: React.FC<{ lines: SupplyLine[], containment: Containment[], zones: SupplyZone[] }> = ({ lines, containment, zones }) => {
  const containmentSummary = useMemo(() => {
    const summary = new Map<string, number>();
    containment.forEach(item => {
      const currentLength = summary.get(item.type) || 0;
      summary.set(item.type, currentLength + item.length);
    });
    return Array.from(summary.entries());
  }, [containment]);

  return (
    <>
      <LvCableSummary lines={lines} />
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Containment Summary</h3>
        <div className="space-y-1.5 text-sm">
          {containmentSummary.length > 0 ? containmentSummary.map(([type, totalLength]) => {
            const style = getContainmentStyle(type as any, type as any);
            return (
              <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <svg width="24" height="4" className="flex-shrink-0">
                    <line x1="0" y1="2" x2="24" y2="2" style={{ stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.join(' '), strokeLinecap: 'round' }} />
                  </svg>
                  <span className="text-gray-300 text-xs">{type}</span>
                </div>
                <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span>
              </div>
            )
          }) : <p className="text-gray-500 text-xs">No containment systems drawn.</p>}
        </div>
      </div>
      <ZoneSummary zones={zones} />
    </>
  )
};


const PVDesignSummary: React.FC<{
  lines: SupplyLine[],
  pvPanelConfig: PVPanelConfig | null,
  pvArrays: PVArrayItem[],
  zones: SupplyZone[],
  modulesPerString: number,
  onModulesPerStringChange: (value: number) => void
}> = ({ lines, pvPanelConfig, pvArrays, zones, modulesPerString, onModulesPerStringChange }) => {
  const { dcTotalLength, acTotalLength } = useMemo(() => {
    const dcLines = lines.filter(l => l.type === 'dc');
    const acLines = lines.filter(l => l.type === 'lv'); // 'lv' is used for AC
    return {
      dcTotalLength: dcLines.reduce((sum, l) => sum + l.length, 0),
      acTotalLength: acLines.reduce((sum, l) => sum + l.length, 0)
    };
  }, [lines]);

  const { totalPanels, totalWattage, totalStrings } = useMemo(() => {
    if (!pvPanelConfig) return { totalPanels: 0, totalWattage: 0, totalStrings: 0 };
    const totalPanels = pvArrays.reduce((sum, arr) => sum + arr.rows * arr.columns, 0);
    const totalStrings = modulesPerString > 0 ? Math.ceil(totalPanels / modulesPerString) : 0;
    return {
      totalPanels,
      totalWattage: totalPanels * pvPanelConfig.wattage,
      totalStrings
    };
  }, [pvArrays, pvPanelConfig, modulesPerString]);

  return (
    <>
      <div className="mb-6 p-3 bg-gray-900/70 rounded-lg">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Panel Configuration</h3>
        {pvPanelConfig ? (
          <div className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between"><span>Dimensions:</span> <span className='font-mono'>{pvPanelConfig.length}m x {pvPanelConfig.width}m</span></div>
            <div className="flex justify-between"><span>Wattage:</span> <span className='font-mono'>{pvPanelConfig.wattage} Wp</span></div>
          </div>
        ) : (
          <p className="text-gray-500 text-xs">Not configured.</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Array Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sky-400">Total Arrays</span>
              <span className="font-mono font-bold text-sky-400">{pvArrays.length}</span>
            </div>
          </div>
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sky-400">Total Panels</span>
              <span className="font-mono font-bold text-sky-400">{totalPanels}</span>
            </div>
          </div>
          <div className="bg-gray-700/50 p-2 rounded-md">
            <label className="flex justify-between items-center gap-2">
              <span className="text-purple-400 text-xs">Modules per String</span>
              <input
                type="number"
                min="1"
                max="100"
                value={modulesPerString}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0 && val <= 100) {
                    onModulesPerStringChange(val);
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-purple-400 font-mono font-bold text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </label>
          </div>
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-purple-400">Total Strings</span>
              <span className="font-mono font-bold text-purple-400">{totalStrings}</span>
            </div>
          </div>
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-green-400">Total DC Power</span>
              <span className="font-mono font-bold text-green-400">{(totalWattage / 1000).toFixed(2)} kWp</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">PV Line Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-orange-400">DC Line Total Length</span>
              <span className="font-mono font-bold text-orange-400">{dcTotalLength.toFixed(2)}m</span>
            </div>
          </div>
          <div className="bg-gray-700/50 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-blue-400">AC Line Total Length</span>
              <span className="font-mono font-bold text-blue-400">{acTotalLength.toFixed(2)}m</span>
            </div>
          </div>
        </div>
      </div>
      <LvCableSummary lines={lines} />
      <ZoneSummary zones={zones} />
    </>
  );
};

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  equipment, lines, zones, containment, selectedItemId, setSelectedItemId,
  onEquipmentUpdate, onZoneUpdate, onDeleteItem, purposeConfig, designPurpose,
  pvPanelConfig, pvArrays, tasks, onOpenTaskModal, onJumpToZone, modulesPerString, onModulesPerStringChange,
  projectId,
  floorPlanId,
  scaleInfo,
  roofMasks = [],
  onJumpToRoofMask,
  onRoofMaskUpdate,
  selectedCircuit,
  onSelectCircuit,
  onEditCable,
  onStartRegionSelect,
  isSelectingRegion,
}) => {
  const [activeTab, setActiveTab] = useState<EquipmentPanelTab>('summary');
  const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});
  const [show3DModal, setShow3DModal] = useState(false);
  const [topLevelView, setTopLevelView] = useState<TopLevelView>('overview');
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());

  // State for Add DB dialog
  const [showAddBoardDialog, setShowAddBoardDialog] = useState(false);
  const [boardFormData, setBoardFormData] = useState({ name: '', location: '', description: '' });
  const createBoard = useCreateDistributionBoard();

  // State for Add Circuit dialog
  const [showAddCircuitDialog, setShowAddCircuitDialog] = useState(false);
  const [addCircuitBoardId, setAddCircuitBoardId] = useState<string | null>(null);
  const [circuitFormData, setCircuitFormData] = useState({ circuit_ref: '', description: '', circuit_type: '' });
  const createCircuit = useCreateCircuit();
  const deleteCircuit = useDeleteCircuit();

  // State for Templates dialog
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showBulkAssemblyEditor, setShowBulkAssemblyEditor] = useState(false);

  // Handle bulk assembly updates
  const handleBulkAssemblyUpdate = (updates: { id: string; assemblyModifications: AssemblyModification[] }[]) => {
    updates.forEach(update => {
      const item = equipment.find(e => e.id === update.id);
      if (item) {
        onEquipmentUpdate({ ...item, assemblyModifications: update.assemblyModifications });
      }
    });
  };
  const { data: boards, isLoading: loadingBoards } = useDistributionBoards(projectId || '');

  const toggleBoard = (boardId: string) => {
    setExpandedBoards(prev => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  // Fetch all cable entries for this project from the database
  const { data: cableEntries = [], isLoading: loadingCables } = useQuery({
    queryKey: ['cable-entries-floor-plan', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Get all floor plan IDs for this project
      const { data: floorPlans } = await supabase
        .from('floor_plan_projects')
        .select('id')
        .eq('project_id', projectId);

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      // Get all cable schedule IDs for this project
      const { data: schedules } = await supabase
        .from('cable_schedules')
        .select('id')
        .eq('project_id', projectId);

      const scheduleIds = schedules?.map(s => s.id) || [];

      if (floorPlanIds.length === 0 && scheduleIds.length === 0) return [];

      // Fetch cable entries linked to either floor plans or schedules
      const orConditions = [];
      if (floorPlanIds.length > 0) {
        orConditions.push(`floor_plan_id.in.(${floorPlanIds.join(',')})`);
      }
      if (scheduleIds.length > 0) {
        orConditions.push(`schedule_id.in.(${scheduleIds.join(',')})`);
      }

      const { data, error } = await supabase
        .from('cable_entries')
        .select('*')
        .or(orConditions.join(','))
        .order('cable_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const toggleAssigneeExpansion = (assigneeName: string) => {
    setExpandedAssignees(prev => ({
      ...prev,
      [assigneeName]: !prev[assigneeName],
    }));
  };

  // Calculate cable summary from database entries
  const cableSummary = useMemo(() => {
    const summary = new Map<string, { type: string; size: string; count: number; totalLength: number; totalCost: number }>();

    cableEntries.forEach(entry => {
      const key = `${entry.cable_type || 'Unknown'}_${entry.cable_size || 'N/A'}`;
      const existing = summary.get(key) || {
        type: entry.cable_type || 'Unknown',
        size: entry.cable_size || 'N/A',
        count: 0,
        totalLength: 0,
        totalCost: 0
      };

      existing.count += entry.quantity || 1;
      existing.totalLength += (entry.total_length || 0) * (entry.quantity || 1);
      existing.totalCost += entry.total_cost || 0;

      summary.set(key, existing);
    });

    return Array.from(summary.values()).sort((a, b) =>
      a.type.localeCompare(b.type) || a.size.localeCompare(b.size)
    );
  }, [cableEntries]);

  const totalCableLength = useMemo(() =>
    cableEntries.reduce((sum, entry) => sum + ((entry.total_length || 0) * (entry.quantity || 1)), 0)
    , [cableEntries]);

  const totalCableCost = useMemo(() =>
    cableEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0)
    , [cableEntries]);

  const { itemDictionary, equipmentCounts, containmentSummary, tasksByStatus, tasksByAssignee } = useMemo(() => {
    const eqCounts = new Map<EquipmentType, number>();
    if (purposeConfig) {
      purposeConfig.availableEquipment.forEach(type => eqCounts.set(type, 0));
      equipment.forEach(item => {
        if (eqCounts.has(item.type)) {
          eqCounts.set(item.type, (eqCounts.get(item.type) || 0) + 1);
        }
      });
    }

    const contSummary = new Map<string, Map<string, number>>();
    containment.forEach(item => {
      if (item.type === item.size) return; // Exclude line-shop trunking with no sizes
      const typeKey = item.type.toString();
      if (!contSummary.has(typeKey)) {
        contSummary.set(typeKey, new Map<string, number>());
      }
      const typeMap = contSummary.get(typeKey)!;
      const currentLength = typeMap.get(item.size) || 0;
      typeMap.set(item.size, currentLength + item.length);
    });

    const tasksByStatus = {
      [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO),
      [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
      [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE),
    };

    // FIX: Correctly type the accumulator for the reduce function.
    const tasksByAssignee = tasks.reduce<Record<string, Task[]>>((acc, task) => {
      const assignee = task.assignedTo?.trim() || 'Unassigned';
      if (!acc[assignee]) {
        acc[assignee] = [];
      }
      acc[assignee].push(task);
      return acc;
    }, {});

    const itemDict = new Map<string, string>();
    equipment.forEach(e => itemDict.set(e.id, e.name || e.type));
    zones.forEach(z => itemDict.set(z.id, z.name));

    return {
      equipmentCounts: Array.from(eqCounts.entries()),
      containmentSummary: Array.from(contSummary.entries()).map(([type, sizeMap]) => ({
        type: type as any,
        sizes: Array.from(sizeMap.entries()).map(([size, totalLength]) => ({ size, totalLength }))
          .sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0))
      })),
      tasksByStatus,
      tasksByAssignee,
      itemDictionary: itemDict,
    };
  }, [equipment, containment, purposeConfig, tasks, zones]);


  const selectedEquipment = useMemo(() => {
    if (!selectedItemId) return null;
    return equipment.find(e => e.id === selectedItemId) || null;
  }, [selectedItemId, equipment]);

  const selectedZone = useMemo(() => {
    if (!selectedItemId) return null;
    return zones.find(z => z.id === selectedItemId) || null;
  }, [selectedItemId, zones]);

  const selectedPvArray = useMemo(() => {
    if (!selectedItemId) return null;
    return pvArrays.find(p => p.id === selectedItemId) || null;
  }, [selectedItemId, pvArrays]);

  const selectedLine = useMemo(() => {
    if (!selectedItemId) return null;
    return lines.find(l => l.id === selectedItemId) || null;
  }, [selectedItemId, lines]);

  const selectedContainment = useMemo(() => {
    if (!selectedItemId) return null;
    return containment.find(c => c.id === selectedItemId) || null;
  }, [selectedItemId, containment]);
  
  const selectedRoofMask = useMemo(() => {
    if (!selectedItemId) return null;
    return roofMasks.find(rm => rm.id === selectedItemId) || null;
  }, [selectedItemId, roofMasks]);
  
  const hasCables = useMemo(() => cableEntries.length > 0 || lines.some(l => l.type === 'lv' && l.cableType), [cableEntries, lines]);

  const renderSummaryTab = () => {
    switch (designPurpose) {
      case DesignPurpose.PV_DESIGN:
        return <PVDesignSummary
          lines={lines}
          pvPanelConfig={pvPanelConfig}
          pvArrays={pvArrays}
          zones={zones}
          modulesPerString={modulesPerString}
          onModulesPerStringChange={onModulesPerStringChange}
        />;
      case DesignPurpose.LINE_SHOP_MEASUREMENTS:
        return <LineShopSummary lines={lines} containment={containment} zones={zones} />;
      default:
        return <BudgetMarkupSummary lines={lines} zones={zones} />;
    }
  }

  const TabButton: React.FC<{ tabId: EquipmentPanelTab; label: string, count?: number, disabled?: boolean }> = ({ tabId, label, count, disabled = false }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      disabled={disabled}
      className={`px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none flex items-center gap-2 ${activeTab === tabId
        ? 'border-b-2 border-primary text-foreground'
        : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
      {typeof count !== 'undefined' && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-primary/30 text-primary' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
    </button>
  );

  if (!purposeConfig || !designPurpose) {
    return (
      <aside className="w-96 h-full bg-card flex flex-col shadow-lg border-l border-border flex-shrink-0 overflow-hidden">
        <div className='p-4 flex items-center justify-center h-full'>
          <div className="text-center">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Project Overview</h2>
            <p className="text-sm text-muted-foreground">Load a PDF and select design purpose to view project details</p>
          </div>
        </div>
      </aside>
    );
  }

  // Sub-component for Board Circuits within this panel
  const BoardCircuitsLocal: React.FC<{ boardId: string }> = ({ boardId }) => {
    const { data: circuits, isLoading } = useDbCircuits(boardId);

    const handleDeleteCircuit = async (e: React.MouseEvent, circuitId: string) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this circuit?')) {
        // Clear selection if deleting the selected circuit
        if (selectedCircuit?.id === circuitId) {
          onSelectCircuit?.(null);
        }
        await deleteCircuit.mutateAsync({ id: circuitId, boardId });
      }
    };

    const handleOpenAddCircuit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setAddCircuitBoardId(boardId);
      setCircuitFormData({ circuit_ref: '', description: '', circuit_type: '' });
      setShowAddCircuitDialog(true);
    };

    if (isLoading) {
      return <div className="pl-6 py-2 text-xs text-muted-foreground">Loading circuits...</div>;
    }

    return (
      <div className="pl-4 space-y-1">
        {/* Add Circuit Button */}
        <button
          onClick={handleOpenAddCircuit}
          className="w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          <span>Add Circuit</span>
        </button>

        {circuits && circuits.length > 0 ? (
          circuits.map((circuit) => {
            const isSelected = selectedCircuit?.id === circuit.id;
            return (
              <div
                key={circuit.id}
                className={cn(
                  "w-full rounded-md text-sm transition-all flex items-center gap-2 group",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/80 text-foreground"
                )}
              >
                <button
                  onClick={() => onSelectCircuit?.(isSelected ? null : circuit)}
                  className="flex-1 text-left px-3 py-2 flex items-center gap-2 min-w-0"
                >
                  <Zap className={cn("h-3 w-3 flex-shrink-0", isSelected ? "text-primary-foreground" : "text-amber-500")} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{circuit.circuit_ref}</div>
                    {circuit.description && (
                      <div className={cn("text-xs truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {circuit.description}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteCircuit(e, circuit.id)}
                  className={cn(
                    "p-2 opacity-0 group-hover:opacity-100 transition-opacity",
                    isSelected ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"
                  )}
                  title="Delete circuit"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="pl-2 py-1 text-xs text-muted-foreground italic">No circuits yet</div>
        )}
      </div>
    );
  };


  const handleCreateBoard = async () => {
    if (!boardFormData.name.trim() || !projectId) return;
    await createBoard.mutateAsync({
      project_id: projectId,
      name: boardFormData.name,
      location: boardFormData.location || undefined,
      description: boardFormData.description || undefined,
      floor_plan_id: floorPlanId,
    });
    setBoardFormData({ name: '', location: '', description: '' });
    setShowAddBoardDialog(false);
  };

  const handleCreateCircuit = async () => {
    if (!circuitFormData.circuit_ref.trim() || !addCircuitBoardId) return;
    await createCircuit.mutateAsync({
      distribution_board_id: addCircuitBoardId,
      circuit_ref: circuitFormData.circuit_ref,
      description: circuitFormData.description || undefined,
      circuit_type: circuitFormData.circuit_type || undefined,
    });
    setCircuitFormData({ circuit_ref: '', description: '', circuit_type: '' });
    setShowAddCircuitDialog(false);
    setAddCircuitBoardId(null);
  };

  // Render Circuit Schedule View
  const renderCircuitScheduleView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Add DB and AI Scan buttons */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Distribution Boards</span>
        <div className="flex items-center gap-2">
          {onStartRegionSelect && (
            <Button
              variant={isSelectingRegion ? "default" : "outline"}
              size="sm"
              onClick={onStartRegionSelect}
              disabled={isSelectingRegion}
              className="h-7 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isSelectingRegion ? 'Selecting...' : 'AI Scan'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddBoardDialog(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add DB
          </Button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        {selectedCircuit ? (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground">
              <Zap className="h-3 w-3 mr-1" />
              {selectedCircuit.circuit_ref}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Trace items to assign
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-xs">
              Select a circuit to assign traced items
            </span>
          </div>
        )}
      </div>

      {/* Boards List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loadingBoards ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Loading distribution boards...
            </div>
          ) : !boards || boards.length === 0 ? (
            <div className="text-center py-8">
              <CircuitBoard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No distribution boards found.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create a distribution board to start adding circuits.
              </p>
              <Button size="sm" onClick={() => setShowAddBoardDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Distribution Board
              </Button>
            </div>
          ) : (
            <>
              {/* Unassigned / General Option */}
              <button
                onClick={() => onSelectCircuit?.({
                  id: 'unassigned',
                  circuit_ref: 'Unassigned',
                  description: 'General materials not tied to a circuit',
                  distribution_board_id: '',
                  board_id: '',
                  display_order: 0,
                  created_at: '',
                  updated_at: '',
                  cable_size: null,
                  breaker_size: null,
                  load_amps: null,
                  voltage: null,
                  power_factor: null,
                  circuit_type: null,
                  notes: null,
                } as DbCircuit)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-md text-sm transition-all flex items-center gap-2 mb-3 border-2 border-dashed",
                  selectedCircuit?.id === 'unassigned'
                    ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "hover:bg-muted border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                <Package className="h-4 w-4 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <div className="font-medium">Unassigned / General</div>
                  <div className="text-xs opacity-70">First fix & general materials</div>
                </div>
              </button>

              {/* Distribution Boards List */}
              {boards.map((board) => (
                <Collapsible
                  key={board.id}
                  open={expandedBoards.has(board.id)}
                  onOpenChange={() => toggleBoard(board.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left">
                    {expandedBoards.has(board.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm text-foreground">{board.name}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1 pb-2">
                    <BoardCircuitsLocal boardId={board.id} />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Materials Section (shown when circuit is selected) */}
      {selectedCircuit && (
        <div className="border-t border-border flex-shrink-0">
          <div className="px-4 py-2 bg-muted/50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedCircuit.id === 'unassigned' ? 'Template Library' : 'Assigned Materials'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowTemplatesDialog(true)}
            >
              <FileText className="h-3 w-3 mr-1" />
              Templates
            </Button>
          </div>
          <ScrollArea className="h-48">
            <div className="p-3">
              {selectedCircuit.id === 'unassigned' ? (
                <div className="text-center py-4">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    Global Template Library
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create & manage templates here, then apply to any circuit
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowTemplatesDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open Templates
                  </Button>
                </div>
              ) : (
                <CircuitMaterialsListLocal circuitId={selectedCircuit.id} projectId={projectId} />
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  // Simple materials list for the circuit - shows both db materials AND canvas circuit lines
  const CircuitMaterialsListLocal: React.FC<{ circuitId: string; projectId?: string }> = ({ circuitId, projectId: listProjectId }) => {
    const { data: materials, isLoading } = useCircuitMaterials(circuitId, { projectId: listProjectId });
    const deleteMutation = useDeleteCircuitMaterial();

    // Get circuit wiring lines from canvas that match this circuit
    // For 'unassigned', show lines with no dbCircuitId
    const circuitWiringLines = useMemo(() => {
      if (circuitId === 'unassigned') {
        return lines.filter(line => !line.dbCircuitId && line.id.startsWith('circuit-'));
      }
      return lines.filter(line => line.dbCircuitId === circuitId && line.id.startsWith('circuit-'));
    }, [lines, circuitId]);

    if (isLoading) {
      return <div className="text-xs text-muted-foreground text-center py-4">Loading materials...</div>;
    }

    // Filter out consumable/ancillary items that shouldn't clutter the assigned materials list
    const EXCLUDED_MATERIAL_PATTERNS = ['cable tie', 'cable saddle', 'cable clip', 'cable identification marker'];

    const filteredMaterials = materials?.filter(m => {
      const desc = m.description?.toLowerCase() || '';
      return !EXCLUDED_MATERIAL_PATTERNS.some(pattern => desc.includes(pattern));
    }) || [];

    const hasAnyContent = filteredMaterials.length > 0 || circuitWiringLines.length > 0;

    if (!hasAnyContent) {
      return (
        <div className="text-center py-4">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">No materials assigned yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Show circuit wiring from canvas lines */}
        {circuitWiringLines.map((line) => {
          const isGpWire = line.cableType?.toUpperCase().includes('GP');
          const totalLength = isGpWire ? line.length * 3 : line.length;

          return (
            <div
              key={line.id}
              className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {line.cableType || 'Cable'} - {line.from} to {line.to}
                </div>
                <div className="text-muted-foreground">
                  {isGpWire ? (
                    <span>{line.length.toFixed(2)}m × 3 (L+E+N) = {totalLength.toFixed(2)}m</span>
                  ) : (
                    <span>{line.length.toFixed(2)}m</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Delete this circuit wiring?')) {
                    setSelectedItemId(line.id);
                    setTimeout(() => onDeleteItem(), 100);
                  }
                }}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Show materials from database (equipment, etc.) - already filtered above */}
        {filteredMaterials.filter(m => !m.canvas_line_id).map((material) => {
          const isGpWire = material.description?.toUpperCase().includes('GP') && material.unit === 'm';
          const totalLength = isGpWire ? material.quantity * 3 : material.quantity;

          return (
            <div
              key={material.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{material.description}</div>
                <div className="text-muted-foreground">
                  {isGpWire ? (
                    <span>{material.quantity.toFixed(2)}m × 3 (L+E+N) = {totalLength.toFixed(2)} {material.unit}</span>
                  ) : (
                    <span>{material.quantity} {material.unit || 'No'}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate({ id: material.id, circuitId })}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-96 h-full bg-card flex flex-col shadow-lg border-l border-border flex-shrink-0 overflow-hidden">
      {/* Top-Level View Switcher */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setTopLevelView('overview')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            topLevelView === 'overview'
              ? "bg-muted text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setTopLevelView('circuits')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            topLevelView === 'circuits'
              ? "bg-muted text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <CircuitBoard className="h-4 w-4" />
          Circuits
          {selectedCircuit && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selectedCircuit.circuit_ref}
            </Badge>
          )}
        </button>
      </div>

      {/* Circuit Schedule View */}
      {topLevelView === 'circuits' && renderCircuitScheduleView()}
      {/* Project Overview View */}
      {/* Project Overview View */}
      {topLevelView === 'overview' && (
        <>
          <div className='p-4 flex-shrink-0'>
            {selectedEquipment && <SelectionDetails item={selectedEquipment} onUpdate={onEquipmentUpdate} onDelete={onDeleteItem} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />}
            {selectedZone && <ZoneDetails item={selectedZone} onUpdate={onZoneUpdate} onDelete={onDeleteItem} onDeselect={() => setSelectedItemId(null)} tasks={tasks} onOpenTaskModal={onOpenTaskModal} />}
            {selectedPvArray && <PvArrayDetails item={selectedPvArray} pvPanelConfig={pvPanelConfig} onDelete={onDeleteItem} />}
            {selectedLine && <CableDetails item={selectedLine} onDelete={onDeleteItem} onEdit={onEditCable ? () => onEditCable(selectedLine) : undefined} tasks={tasks} onOpenTaskModal={onOpenTaskModal} projectId={projectId} floorPlanId={floorPlanId} currentCircuitId={selectedLine.dbCircuitId} />}
            {selectedContainment && <ContainmentDetails item={selectedContainment} onDelete={onDeleteItem} projectId={projectId} floorPlanId={floorPlanId} />}
            {selectedRoofMask && onRoofMaskUpdate && <RoofMaskDetails item={selectedRoofMask} onUpdate={onRoofMaskUpdate} onDelete={onDeleteItem} onDeselect={() => setSelectedItemId(null)} />}
          </div>

          <div className="border-b border-border px-2 flex-shrink-0">
            <nav className="-mb-px flex flex-wrap" aria-label="Tabs">
              <TabButton tabId="summary" label="Summary" />
              <TabButton tabId="equipment" label="Equipment" />
              <TabButton tabId="assemblies" label="Assemblies" />
              <TabButton tabId="cables" label="Cables" disabled={!hasCables} />
              <TabButton tabId="containment" label="Containment" />
              <TabButton tabId="roofMasks" label="Roof Masks" count={roofMasks.length} />
              <TabButton tabId="zones" label="Exclusion Zones" />
              <TabButton tabId="tasks" label="Tasks" count={tasks.length} />
            </nav>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            <div style={{ display: activeTab === 'summary' ? 'block' : 'none' }}>{renderSummaryTab()}</div>
            <div style={{ display: activeTab === 'equipment' ? 'block' : 'none' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipment Quantities</h3>
                {equipment.length > 0 && (
                  <button
                    onClick={() => setShowBulkAssemblyEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Settings2 size={14} />
                    Bulk Edit Assemblies
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-1">
                {equipmentCounts.filter(([, count]) => count > 0).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                    <div className="flex items-center gap-3">
                      <EquipmentIcon type={type} className="h-5 w-5 text-amber-400" />
                      <span className="text-gray-300 text-xs flex-1">{type}</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded">{count}</span>
                  </div>
                ))}
                {equipmentCounts.filter(([_, count]) => count > 0).length === 0 && <p className="text-gray-500 text-xs text-center p-4">No equipment placed.</p>}
              </div>
            </div>

            {/* Assemblies Tab */}
            <div style={{ display: activeTab === 'assemblies' ? 'block' : 'none' }}>
              <AssembliesTab
                equipment={equipment}
                zones={zones}
                onEquipmentUpdate={onEquipmentUpdate}
                onOpenBulkEditor={() => setShowBulkAssemblyEditor(true)}
              />
            </div>

            <div style={{ display: activeTab === 'cables' ? 'block' : 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cable Schedule</h3>
                {lines.filter(l => l.cableType && l.points.length >= 2).length > 0 && (
                  <button
                    onClick={() => setShow3DModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Box size={14} />
                    3D Analysis
                  </button>
                )}
              </div>
              {loadingCables ? (
                <p className="text-gray-500 text-xs text-center p-4">Loading cables...</p>
              ) : cableEntries.length > 0 ? (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Summary Totals Card */}
                  <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Total Cables:</span>
                      <span className="font-bold text-primary">{cableEntries.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Total Length:</span>
                      <span className="font-bold text-amber-400">{totalCableLength.toFixed(2)}m</span>
                    </div>
                    {totalCableCost > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-medium">Total Cost:</span>
                        <span className="font-bold text-green-400">R {totalCableCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Cable Type Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Breakdown by Type & Size</h4>
                    {cableSummary.map((summary) => (
                      <div key={`${summary.type}_${summary.size}`} className="bg-gray-700/50 p-2.5 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-200">{summary.type}</div>
                            <div className="text-[10px] text-gray-400">Size: {summary.size}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-amber-400">{summary.count} cables</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>Total Length: <span className="text-gray-300 font-mono">{summary.totalLength.toFixed(2)}m</span></span>
                          {summary.totalCost > 0 && (
                            <span>Cost: <span className="text-green-400 font-mono">R {summary.totalCost.toFixed(2)}</span></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Individual Entries */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Individual Cables ({cableEntries.length})</h4>
                    {cableEntries.map(entry => (
                      <div key={entry.id} className="bg-gray-700/30 p-2 rounded-md space-y-1 border border-gray-600/30">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-amber-400 text-xs">{entry.cable_tag}</span>
                          <span className="text-gray-400 font-mono text-[10px]">{entry.cable_type} {entry.cable_size || 'N/A'}</span>
                        </div>
                        <div className="text-gray-400 text-[10px] space-y-0.5">
                          <div>From: <span className="text-gray-300">{entry.from_location}</span></div>
                          <div>To: <span className="text-gray-300">{entry.to_location}</span></div>
                          <div className="flex justify-between items-center pt-1 border-t border-gray-600/30">
                            <span>Length: <span className="text-gray-300 font-mono">{entry.total_length?.toFixed(2) || 0}m</span></span>
                            {entry.total_cost && entry.total_cost > 0 && (
                              <span>Cost: <span className="text-green-400 font-mono">R {entry.total_cost.toFixed(2)}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs text-center p-4">No cables in schedule for this project.</p>
              )}
            </div>

            <div style={{ display: activeTab === 'containment' ? 'block' : 'none' }}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Containment Schedule</h3>
              <div className="space-y-4">
                {containmentSummary.length > 0 ? containmentSummary.map(({ type, sizes }) => (
                  <div key={type}><h4 className="font-bold text-sm text-gray-300 mb-2">{type}</h4><div className="space-y-1.5 text-xs">
                    {sizes.map(({ size, totalLength }) => {
                      const style = getContainmentStyle(type as any, size);
                      return (<div key={size} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md"><div className="flex items-center gap-3">
                        <svg width="24" height="4" className="flex-shrink-0"><line x1="0" y1="2" x2="24" y2="2" style={{ stroke: style.color, strokeWidth: 2, strokeDasharray: style.dash.map(d => d * 2).join(' '), strokeLinecap: 'round' }} /></svg>
                        <span className="text-gray-300 w-32">{size}</span></div>
                        <span className="font-mono font-bold text-indigo-400">{totalLength.toFixed(2)}m</span></div>)
                    })}</div></div>
                )) : <p className="text-gray-500 text-xs text-center p-4">No containment systems drawn.</p>}
              </div>
            </div>

            {/* Roof Masks Tab */}
            <div style={{ display: activeTab === 'roofMasks' ? 'block' : 'none' }}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Roof Masks ({roofMasks.length})
              </h3>
              <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-2">
                {roofMasks.length > 0 ? roofMasks.map((mask, index) => (
                  <div 
                    key={mask.id}
                    className={`w-full text-left p-2 rounded-md transition-colors ${selectedItemId === mask.id ? 'bg-indigo-600/30 ring-1 ring-indigo-400' : 'bg-gray-700/50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedItemId(mask.id)}
                        className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: 'rgba(148, 112, 216, 0.6)' }}
                        />
                        <div>
                          <span className="text-gray-300 font-medium">Roof Mask {index + 1}</span>
                          <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              Pitch: {mask.pitch}°
                            </span>
                            <span>|</span>
                            <span>Dir: {mask.direction}°</span>
                            {mask.area !== undefined && mask.area > 0 && (
                              <>
                                <span>|</span>
                                <span className="font-mono text-purple-400">{mask.area.toFixed(1)}m²</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {onJumpToRoofMask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onJumpToRoofMask(mask);
                            }}
                            className="p-1 hover:bg-indigo-500/30 rounded transition-colors"
                            title="Jump to roof mask in drawing"
                          >
                            <Eye size={16} className="text-indigo-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-xs text-center p-4">No roof masks defined. Use the Roof Mask tool to draw mask areas.</p>
                )}
              </div>
            </div>

            {/* Exclusion Zones Tab */}
            <div style={{ display: activeTab === 'zones' ? 'block' : 'none' }}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exclusion Zones ({zones.length})</h3>
              <div className="space-y-1.5 text-sm max-h-[60vh] overflow-y-auto pr-2">
                {zones.length > 0 ? zones.map(zone => (
                  <div key={zone.id}
                    className={`w-full text-left p-2 rounded-md transition-colors ${selectedItemId === zone.id ? 'bg-indigo-600/30 ring-1 ring-indigo-400' : 'bg-gray-700/50'}`}>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedItemId(zone.id)}
                        className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }}></div>
                        <span className="text-gray-300 font-medium">{zone.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-yellow-400">{zone.area > 0 ? `${zone.area.toFixed(2)}m²` : '--'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToZone(zone);
                          }}
                          className="p-1 hover:bg-indigo-500/30 rounded transition-colors"
                          title="Jump to zone in drawing"
                        >
                          <Eye size={16} className="text-indigo-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-gray-500 text-xs text-center p-4">No exclusion zones defined.</p>}
              </div>
            </div>

            <div style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tasks by Assignee</h3>
                <div className="space-y-2">
                  {Object.keys(tasksByAssignee).sort((a, b) => { if (a === 'Unassigned') return 1; if (b === 'Unassigned') return -1; return a.localeCompare(b); }).map(assignee => (
                    <div key={assignee} className="bg-gray-700/50 rounded-md overflow-hidden">
                      <button onClick={() => toggleAssigneeExpansion(assignee)} className="w-full flex justify-between items-center p-2 text-left hover:bg-gray-700 transition-colors">
                        <span className="font-semibold text-sm text-gray-200">{assignee}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-600 text-indigo-300 font-bold px-2 py-0.5 rounded-full">{tasksByAssignee[assignee].length}</span>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedAssignees[assignee] ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {expandedAssignees[assignee] && (
                        <div className="p-2 border-t border-gray-600/50 space-y-1.5">
                          {tasksByAssignee[assignee].map(task => (
                            <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-gray-900/40 p-2 rounded-md hover:bg-gray-900/80 transition-colors">
                              <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-200 text-xs truncate">{task.title}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${task.status === TaskStatus.DONE ? 'bg-green-500/20 text-green-400' :
                                  task.status === TaskStatus.IN_PROGRESS ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-gray-600 text-gray-300'
                                  }`}>{task.status}</span>
                              </div>
                              <p className="text-gray-400 text-[10px] truncate mt-1">For: {itemDictionary.get(task.linkedItemId) || 'Unknown Item'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-700 my-4" />

              {Object.entries(tasksByStatus).map(([status, tasksInStatus]) => (
                <div key={status} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {status === TaskStatus.TODO && <Circle size={14} className="text-gray-400" />}
                    {status === TaskStatus.IN_PROGRESS && <Clock size={14} className="text-amber-400" />}
                    {status === TaskStatus.DONE && <CheckCircle size={14} className="text-green-400" />}
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{status} ({tasksInStatus.length})</h3>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {tasksInStatus.length > 0 ? tasksInStatus.map(task => (
                      <button key={task.id} onClick={() => onOpenTaskModal(task)} className="w-full text-left bg-gray-700/50 p-2 rounded-md hover:bg-gray-700 transition-colors">
                        <p className="font-semibold text-gray-200 text-xs truncate">{task.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-gray-400 text-[10px] truncate">For: {itemDictionary.get(task.linkedItemId) || 'Unknown Item'}</p>
                          {task.assignedTo && <p className="text-gray-400 text-[10px]">@{task.assignedTo}</p>}
                        </div>
                      </button>
                    )) : <p className="text-gray-500 text-xs text-center p-2">No tasks in this category.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 3D Cable Route Analysis Modal */}
      {/* 3D Floor Plan Visualization (Replaces Cable Route Analysis) */}
      <FloorPlan3DDialog
        open={show3DModal}
        onOpenChange={setShow3DModal}
        lines={lines}
        equipment={equipment}
        containment={containment}
        scaleInfo={scaleInfo || { pixelDistance: null, realDistance: null, ratio: 0.05 }}
      />

      {/* Add Distribution Board Dialog */}
      <Dialog open={showAddBoardDialog} onOpenChange={setShowAddBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Distribution Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="db-name">Name *</Label>
              <Input
                id="db-name"
                placeholder="e.g., DB-1, DB-1A"
                value={boardFormData.name}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="db-location">Location</Label>
              <Input
                id="db-location"
                placeholder="e.g., Shop 1, Common Area"
                value={boardFormData.location}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="db-desc">Description</Label>
              <Input
                id="db-desc"
                placeholder="Optional description"
                value={boardFormData.description}
                onChange={(e) => setBoardFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBoardDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBoard} disabled={!boardFormData.name.trim() || createBoard.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Circuit Dialog */}
      <Dialog open={showAddCircuitDialog} onOpenChange={(open) => {
        setShowAddCircuitDialog(open);
        if (!open) setAddCircuitBoardId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Circuit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="circuit-ref">Circuit Reference *</Label>
              <Input
                id="circuit-ref"
                placeholder="e.g., L1, P1, AC-1"
                value={circuitFormData.circuit_ref}
                onChange={(e) => setCircuitFormData(prev => ({ ...prev, circuit_ref: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="circuit-type">Circuit Type</Label>
              <Select
                value={circuitFormData.circuit_type}
                onValueChange={(value) => setCircuitFormData(prev => ({ ...prev, circuit_type: value }))}
              >
                <SelectTrigger id="circuit-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="circuit-desc">Description</Label>
              <Input
                id="circuit-desc"
                placeholder="e.g., Lighting circuit 1"
                value={circuitFormData.description}
                onChange={(e) => setCircuitFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddCircuitDialog(false);
              setAddCircuitBoardId(null);
            }}>Cancel</Button>
            <Button onClick={handleCreateCircuit} disabled={!circuitFormData.circuit_ref.trim() || createCircuit.isPending}>
              Add Circuit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <CircuitTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        circuitId={selectedCircuit?.id !== 'unassigned' ? selectedCircuit?.id : undefined}
        circuitRef={selectedCircuit?.circuit_ref}
        projectId={projectId}
        floorPlanId={floorPlanId}
      />

      {/* Bulk Assembly Editor */}
      <BulkAssemblyEditor
        equipment={equipment}
        zones={zones}
        open={showBulkAssemblyEditor}
        onOpenChange={setShowBulkAssemblyEditor}
        onBulkUpdate={handleBulkAssemblyUpdate}
        projectId={projectId}
      />
    </aside>
  );
};

export default EquipmentPanel;
