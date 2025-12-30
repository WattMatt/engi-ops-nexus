import React, { useState, useMemo, useCallback } from 'react';
import { 
  Layers, Box, Eye, EyeOff, Maximize2, Minimize2, 
  LayoutGrid, FileText, ChevronDown, ChevronRight,
  Zap, Lightbulb, Plug, Server, Cable, CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { EquipmentItem, SupplyLine, Containment, EquipmentType, ContainmentType, ScaleInfo } from '../types';
import { Isometric3DViewer } from './Isometric3DViewer';
import { CableSchedule } from './CableSchedule';

// Circuit type categories for layer filtering
const CIRCUIT_TYPE_CATEGORIES: Record<string, {
  label: string;
  icon: typeof Plug;
  color: string;
  equipmentTypes?: EquipmentType[];
  containmentTypes?: ContainmentType[];
}> = {
  power: {
    label: 'Power',
    icon: Plug,
    color: 'hsl(var(--chart-1))',
    equipmentTypes: [
      EquipmentType.SOCKET_16A,
      EquipmentType.SOCKET_DOUBLE,
      EquipmentType.EMERGENCY_SOCKET,
      EquipmentType.UPS_SOCKET,
      EquipmentType.SINGLE_PHASE_OUTLET,
      EquipmentType.THREE_PHASE_OUTLET,
      EquipmentType.SOCKET_16A_TP,
      EquipmentType.GEYSER_OUTLET,
      EquipmentType.FLUSH_FLOOR_OUTLET,
      EquipmentType.BOX_FLUSH_FLOOR,
      EquipmentType.CLEAN_POWER_OUTLET,
      EquipmentType.WORKSTATION_OUTLET,
    ],
  },
  lighting: {
    label: 'Lighting',
    icon: Lightbulb,
    color: 'hsl(var(--chart-2))',
    equipmentTypes: [
      EquipmentType.GENERAL_LIGHT_SWITCH,
      EquipmentType.DIMMER_SWITCH,
      EquipmentType.TWO_WAY_LIGHT_SWITCH,
      EquipmentType.WATERTIGHT_LIGHT_SWITCH,
      EquipmentType.LED_STRIP_LIGHT,
      EquipmentType.FLUORESCENT_2_TUBE,
      EquipmentType.FLUORESCENT_1_TUBE,
      EquipmentType.CEILING_FLOODLIGHT,
      EquipmentType.CEILING_LIGHT,
      EquipmentType.POLE_MOUNTED_LIGHT,
      EquipmentType.WALL_MOUNTED_LIGHT,
      EquipmentType.RECESSED_LIGHT_600,
      EquipmentType.RECESSED_LIGHT_1200,
      EquipmentType.FLOODLIGHT,
      EquipmentType.PHOTO_CELL,
      EquipmentType.MOTION_SENSOR,
    ],
  },
  data: {
    label: 'Data/Comms',
    icon: Server,
    color: 'hsl(var(--chart-3))',
    equipmentTypes: [
      EquipmentType.DATA_SOCKET,
      EquipmentType.TELEPHONE_OUTLET,
      EquipmentType.TV_OUTLET,
      EquipmentType.TELEPHONE_BOARD,
      EquipmentType.CCTV_CAMERA,
    ],
  },
  distribution: {
    label: 'Distribution',
    icon: Zap,
    color: 'hsl(var(--chart-4))',
    equipmentTypes: [
      EquipmentType.DISTRIBUTION_BOARD,
      EquipmentType.MAIN_BOARD,
      EquipmentType.SUB_BOARD,
      EquipmentType.RMU,
      EquipmentType.SUBSTATION,
      EquipmentType.GENERATOR,
    ],
  },
  containment: {
    label: 'Containment',
    icon: Cable,
    color: 'hsl(var(--chart-5))',
    containmentTypes: Object.values(ContainmentType),
  },
  other: {
    label: 'Other',
    icon: CircleDot,
    color: 'hsl(var(--muted-foreground))',
    equipmentTypes: [
      EquipmentType.DRAWBOX_50,
      EquipmentType.DRAWBOX_100,
      EquipmentType.AC_CONTROLLER_BOX,
      EquipmentType.BREAK_GLASS_UNIT,
      EquipmentType.MANHOLE,
    ],
  },
};

type CircuitCategory = keyof typeof CIRCUIT_TYPE_CATEGORIES;

interface ScheduleItem {
  type: string;
  description: string;
  count: number;
  length?: number;
  unit?: string;
}

interface DrawingSheetViewProps {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  containment: Containment[];
  scaleInfo: ScaleInfo;
  projectName?: string;
  roomName?: string;
  roomArea?: number;
  // 2D Canvas render element (passed from parent)
  canvas2DElement?: React.ReactNode;
  onLayerChange?: (visibleCategories: CircuitCategory[]) => void;
  onItemSelect?: (itemId: string | null) => void;
  selectedItemId?: string | null;
}

export function DrawingSheetView({
  equipment,
  lines,
  containment,
  scaleInfo,
  projectName = 'Project',
  roomName = 'Room',
  roomArea,
  canvas2DElement,
  onLayerChange,
  onItemSelect,
  selectedItemId,
}: DrawingSheetViewProps) {
  const [viewMode, setViewMode] = useState<'split' | '2d' | '3d'>('split');
  const [activeLayers, setActiveLayers] = useState<Set<CircuitCategory>>(
    new Set(Object.keys(CIRCUIT_TYPE_CATEGORIES) as CircuitCategory[])
  );
  const [activeScheduleTab, setActiveScheduleTab] = useState('fixtures');
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set(['fixtures', 'equipment', 'cables']));

  // Toggle layer visibility
  const toggleLayer = useCallback((category: CircuitCategory) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      onLayerChange?.(Array.from(next));
      return next;
    });
  }, [onLayerChange]);

  // Filter equipment based on active layers
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      for (const [category, config] of Object.entries(CIRCUIT_TYPE_CATEGORIES)) {
        if (config.equipmentTypes && config.equipmentTypes.includes(item.type)) {
          return activeLayers.has(category as CircuitCategory);
        }
      }
      return activeLayers.has('other');
    });
  }, [equipment, activeLayers]);

  // Filter containment based on active layers
  const filteredContainment = useMemo(() => {
    if (!activeLayers.has('containment')) return [];
    return containment;
  }, [containment, activeLayers]);

  // Generate schedules from data
  const schedules = useMemo(() => {
    // Electrical Fixture Schedule
    const fixtureSchedule: ScheduleItem[] = [];
    const fixtureMap = new Map<string, { count: number; length: number }>();
    
    equipment.forEach(item => {
      const key = item.type;
      const existing = fixtureMap.get(key) || { count: 0, length: 0 };
      fixtureMap.set(key, { count: existing.count + 1, length: 0 });
    });
    
    fixtureMap.forEach((value, key) => {
      fixtureSchedule.push({
        type: key,
        description: key,
        count: value.count,
        length: value.length > 0 ? value.length : undefined,
      });
    });

    // Electrical Equipment Schedule (Distribution boards, etc.)
    const distributionTypes = CIRCUIT_TYPE_CATEGORIES.distribution.equipmentTypes || [];
    const equipmentSchedule = equipment
      .filter(item => distributionTypes.includes(item.type))
      .reduce((acc, item) => {
        const existing = acc.find(s => s.type === item.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            type: item.type,
            description: item.name || item.type,
            count: 1,
          });
        }
        return acc;
      }, [] as ScheduleItem[]);

    // Lighting Fixture Schedule
    const lightingTypes = CIRCUIT_TYPE_CATEGORIES.lighting.equipmentTypes || [];
    const lightingSchedule = equipment
      .filter(item => lightingTypes.includes(item.type))
      .reduce((acc, item) => {
        const existing = acc.find(s => s.type === item.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            type: item.type,
            description: item.type,
            count: 1,
          });
        }
        return acc;
      }, [] as ScheduleItem[]);

    // Conduit Run Schedule
    const conduitSchedule = containment
      .filter(item => item.type.toLowerCase().includes('conduit'))
      .reduce((acc, item) => {
        const key = `${item.type} - ${item.size}`;
        const existing = acc.find(s => s.type === key);
        if (existing) {
          existing.count++;
          existing.length = (existing.length || 0) + item.length;
        } else {
          acc.push({
            type: key,
            description: item.type,
            count: 1,
            length: item.length,
            unit: 'mm',
          });
        }
        return acc;
      }, [] as ScheduleItem[]);

    // Containment Schedule (non-conduit)
    const containmentSchedule = containment
      .filter(item => !item.type.toLowerCase().includes('conduit'))
      .reduce((acc, item) => {
        const key = `${item.type} - ${item.size}`;
        const existing = acc.find(s => s.type === key);
        if (existing) {
          existing.count++;
          existing.length = (existing.length || 0) + item.length;
        } else {
          acc.push({
            type: key,
            description: item.type,
            count: 1,
            length: item.length,
            unit: 'mm',
          });
        }
        return acc;
      }, [] as ScheduleItem[]);

    return {
      fixtures: fixtureSchedule,
      equipment: equipmentSchedule,
      lighting: lightingSchedule,
      conduit: conduitSchedule,
      containment: containmentSchedule,
    };
  }, [equipment, containment]);

  // Convert equipment to 3D points for isometric view
  const points3D = useMemo(() => {
    return filteredEquipment.map((item, index) => ({
      id: item.id,
      x: item.position.x,
      y: item.position.y,
      z: 2.4, // Default ceiling height
      label: item.name || `${item.type.slice(0, 10)}...`,
    }));
  }, [filteredEquipment]);

  // Toggle schedule expansion
  const toggleSchedule = (scheduleId: string) => {
    setExpandedSchedules(prev => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with view mode toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{projectName}</h2>
            <p className="text-xs text-muted-foreground">
              {roomName} {roomArea ? `• ${roomArea.toFixed(0)} m²` : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode buttons */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === '2d' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode('2d')}
            >
              <Layers className="h-4 w-4 mr-1" />
              2D
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 border-x border-border"
              onClick={() => setViewMode('split')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Split
            </Button>
            <Button
              variant={viewMode === '3d' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode('3d')}
            >
              <Box className="h-4 w-4 mr-1" />
              3D
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Layer controls */}
        <div className="w-48 border-r border-border bg-muted/20 flex flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Layers
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {Object.entries(CIRCUIT_TYPE_CATEGORIES).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = activeLayers.has(key as CircuitCategory);
                const itemCount = key === 'containment' 
                  ? containment.length
                  : equipment.filter(e => 
                      config.equipmentTypes && config.equipmentTypes.includes(e.type)
                    ).length;
                
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                      isActive ? "bg-muted" : "hover:bg-muted/50 opacity-50"
                    )}
                    onClick={() => toggleLayer(key as CircuitCategory)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: config.color }}
                      />
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        {itemCount}
                      </Badge>
                      {isActive ? (
                        <Eye className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={cn(
            "flex-1 flex",
            viewMode === 'split' ? "gap-1 p-1" : ""
          )}>
            {/* 2D View */}
            {(viewMode === '2d' || viewMode === 'split') && (
              <div className={cn(
                "bg-muted/30 rounded-lg overflow-hidden border border-border",
                viewMode === 'split' ? "flex-1" : "w-full h-full"
              )}>
                <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  2D LAYOUT • 1:100
                </div>
                {canvas2DElement || (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">2D Canvas will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* 3D View */}
            {(viewMode === '3d' || viewMode === 'split') && (
              <div className={cn(
                "bg-muted/30 rounded-lg overflow-hidden border border-border relative",
                viewMode === 'split' ? "w-[45%]" : "w-full h-full"
              )}>
                <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                  3D ILLUSTRATION
                </div>
                <Isometric3DViewer
                  equipment={filteredEquipment}
                  containment={filteredContainment}
                  lines={lines}
                  scaleInfo={scaleInfo}
                  roomWidth={10}
                  roomDepth={8}
                  ceilingHeight={2.7}
                  selectedItemId={selectedItemId}
                  onItemSelect={onItemSelect}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Schedules */}
        <div className="w-72 border-l border-border bg-muted/20 flex flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Schedules
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {/* Electrical Fixture Schedule */}
              <ScheduleSection
                title="Electrical Fixture Schedule"
                items={schedules.fixtures}
                isExpanded={expandedSchedules.has('fixtures')}
                onToggle={() => toggleSchedule('fixtures')}
              />

              {/* Electrical Equipment Schedule */}
              <ScheduleSection
                title="Electrical Equipment Schedule"
                items={schedules.equipment}
                isExpanded={expandedSchedules.has('equipment')}
                onToggle={() => toggleSchedule('equipment')}
                showPanelName
              />

              {/* Lighting Fixture Schedule */}
              <ScheduleSection
                title="Lighting Fixture Schedule"
                items={schedules.lighting}
                isExpanded={expandedSchedules.has('lighting')}
                onToggle={() => toggleSchedule('lighting')}
                showTypeMark
              />

              {/* Conduit Run Schedule */}
              <ScheduleSection
                title="Conduit Run Schedule"
                items={schedules.conduit}
                isExpanded={expandedSchedules.has('conduit')}
                onToggle={() => toggleSchedule('conduit')}
                showLength
              />

              {/* Cable Schedule */}
              <CableSchedule
                equipment={equipment}
                containment={containment}
                isExpanded={expandedSchedules.has('cables')}
                onToggle={() => toggleSchedule('cables')}
              />

              {/* Containment Schedule */}
              <ScheduleSection
                title="Containment Schedule"
                items={schedules.containment}
                isExpanded={expandedSchedules.has('containment')}
                onToggle={() => toggleSchedule('containment')}
                showLength
              />
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="p-3 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Legend
            </h4>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {Object.entries(CIRCUIT_TYPE_CATEGORIES).slice(0, 4).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-muted-foreground truncate">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule Section Component
interface ScheduleSectionProps {
  title: string;
  items: ScheduleItem[];
  isExpanded: boolean;
  onToggle: () => void;
  showPanelName?: boolean;
  showTypeMark?: boolean;
  showLength?: boolean;
}

function ScheduleSection({ 
  title, 
  items, 
  isExpanded, 
  onToggle,
  showPanelName,
  showTypeMark,
  showLength,
}: ScheduleSectionProps) {
  if (items.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">
          {items.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr>
                {showTypeMark && <th className="px-2 py-1 text-left font-medium">Mark</th>}
                <th className="px-2 py-1 text-left font-medium">Type</th>
                {showPanelName && <th className="px-2 py-1 text-left font-medium">Panel</th>}
                <th className="px-2 py-1 text-right font-medium">Count</th>
                {showLength && <th className="px-2 py-1 text-right font-medium">Length</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-border hover:bg-muted/30">
                  {showTypeMark && (
                    <td className="px-2 py-1 font-medium">
                      {String.fromCharCode(65 + index)}
                    </td>
                  )}
                  <td className="px-2 py-1 truncate max-w-[120px]" title={item.description}>
                    {item.description.length > 25 
                      ? `${item.description.slice(0, 25)}...` 
                      : item.description}
                  </td>
                  {showPanelName && (
                    <td className="px-2 py-1">{item.type.split('-')[0] || '-'}</td>
                  )}
                  <td className="px-2 py-1 text-right">{item.count}</td>
                  {showLength && (
                    <td className="px-2 py-1 text-right">
                      {item.length ? `${Math.round(item.length)}` : '0'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default DrawingSheetView;
