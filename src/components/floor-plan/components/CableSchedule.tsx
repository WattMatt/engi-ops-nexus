import React, { useMemo } from 'react';
import { Cable, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CABLE_TYPES, 
  CIRCUIT_TYPE_MAPPINGS, 
  CableTypeDefinition,
  getDefaultCableForCircuit,
} from './cable-types';
import { EquipmentItem, Containment } from '../types';
import { cn } from '@/lib/utils';

// Cable takeoff item for individual circuits
export interface CableTakeoffItem {
  circuit: string;
  circuitLabel: string;
  cableType: CableTypeDefinition;
  liveLength: number;
  neutralLength: number;
  earthLength: number;
  totalLength: number;
  equipmentCount: number;
}

// Cable quantity summary by cable type
export interface CableQuantitySummary {
  cableType: CableTypeDefinition;
  totalLength: number;
  circuits: string[];
  reelsRequired: number; // Assuming 100m reels
}

interface CableScheduleProps {
  equipment: EquipmentItem[];
  containment: Containment[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

// Map equipment types to circuit types
const EQUIPMENT_TO_CIRCUIT: Record<string, string> = {
  // Lighting
  'GENERAL_LIGHT_SWITCH': 'L1',
  'DIMMER_SWITCH': 'L1',
  'TWO_WAY_LIGHT_SWITCH': 'L1',
  'LED_STRIP_LIGHT': 'L1',
  'FLUORESCENT_2_TUBE': 'L1',
  'FLUORESCENT_1_TUBE': 'L1',
  'CEILING_LIGHT': 'L1',
  'RECESSED_LIGHT_600': 'L1',
  'RECESSED_LIGHT_1200': 'L1',
  'WALL_MOUNTED_LIGHT': 'L2',
  'CEILING_FLOODLIGHT': 'L2',
  'FLOODLIGHT': 'L2',
  'POLE_MOUNTED_LIGHT': 'L2',
  
  // Power
  'SOCKET_16A': 'P1',
  'SOCKET_DOUBLE': 'P1',
  'SINGLE_PHASE_OUTLET': 'P1',
  'FLUSH_FLOOR_OUTLET': 'P1',
  'WORKSTATION_OUTLET': 'P2',
  'CLEAN_POWER_OUTLET': 'P2',
  'UPS_SOCKET': 'P2',
  'EMERGENCY_SOCKET': 'P2',
  'THREE_PHASE_OUTLET': 'P3',
  'SOCKET_16A_TP': 'P3',
  'GEYSER_OUTLET': 'GY',
  
  // Kitchen
  'BOX_FLUSH_FLOOR': 'KS',
};

export function CableSchedule({ 
  equipment, 
  containment,
  isExpanded = true,
  onToggle,
}: CableScheduleProps) {
  // Calculate cable takeoff from equipment and containment
  const { takeoffItems, quantitySummary, totalCableLength } = useMemo(() => {
    // Group equipment by circuit type
    const circuitGroups: Record<string, { count: number; length: number }> = {};
    
    equipment.forEach(item => {
      const circuitType = EQUIPMENT_TO_CIRCUIT[item.type] || 'S1';
      if (!circuitGroups[circuitType]) {
        circuitGroups[circuitType] = { count: 0, length: 0 };
      }
      circuitGroups[circuitType].count++;
    });

    // Calculate containment lengths per circuit (simplified - assumes containment carries all circuits)
    const totalContainmentLength = containment.reduce((sum, c) => sum + (c.length || 0), 0);
    const avgLengthPerCircuit = Object.keys(circuitGroups).length > 0 
      ? totalContainmentLength / Object.keys(circuitGroups).length / 1000 // Convert mm to m
      : 0;

    // Generate takeoff items
    const takeoffItems: CableTakeoffItem[] = [];
    
    Object.entries(circuitGroups).forEach(([circuitType, data]) => {
      const mapping = CIRCUIT_TYPE_MAPPINGS.find(m => m.circuitType === circuitType);
      const cableType = getDefaultCableForCircuit(circuitType);
      
      if (mapping && cableType) {
        // Estimate cable length based on equipment count and average route
        // Each piece of equipment adds ~3m cable + share of containment route
        const estimatedLength = (data.count * 3) + (avgLengthPerCircuit * data.count / equipment.length);
        const adjustedLength = Math.max(estimatedLength, 5); // Minimum 5m per circuit
        
        takeoffItems.push({
          circuit: circuitType,
          circuitLabel: mapping.label,
          cableType,
          liveLength: adjustedLength,
          neutralLength: adjustedLength,
          earthLength: adjustedLength,
          totalLength: adjustedLength * 3,
          equipmentCount: data.count,
        });
      }
    });

    // Sort by circuit type
    takeoffItems.sort((a, b) => a.circuit.localeCompare(b.circuit));

    // Generate quantity summary by cable type
    const cableSummary: Record<string, { type: CableTypeDefinition; length: number; circuits: string[] }> = {};
    
    takeoffItems.forEach(item => {
      const typeId = item.cableType.id;
      if (!cableSummary[typeId]) {
        cableSummary[typeId] = { type: item.cableType, length: 0, circuits: [] };
      }
      cableSummary[typeId].length += item.totalLength;
      cableSummary[typeId].circuits.push(item.circuit);
    });

    const quantitySummary: CableQuantitySummary[] = Object.values(cableSummary).map(s => ({
      cableType: s.type,
      totalLength: s.length,
      circuits: s.circuits,
      reelsRequired: Math.ceil(s.length / 100), // 100m per reel
    }));

    // Sort by cable size
    quantitySummary.sort((a, b) => 
      parseFloat(a.cableType.live.size) - parseFloat(b.cableType.live.size)
    );

    const totalCableLength = takeoffItems.reduce((sum, item) => sum + item.totalLength, 0);

    return { takeoffItems, quantitySummary, totalCableLength };
  }, [equipment, containment]);

  if (takeoffItems.length === 0) {
    return null;
  }

  const content = (
    <div className="space-y-3">
      {/* Cable Takeoff Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-muted/50 px-2 py-1.5 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cable Takeoff Schedule
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Circuit</th>
                <th className="px-2 py-1 text-left font-medium">Cable Type</th>
                <th className="px-2 py-1 text-right font-medium">Live (m)</th>
                <th className="px-2 py-1 text-right font-medium">Neutral (m)</th>
                <th className="px-2 py-1 text-right font-medium">Earth (m)</th>
                <th className="px-2 py-1 text-right font-medium">Total (m)</th>
              </tr>
            </thead>
            <tbody>
              {takeoffItems.map((item, index) => (
                <tr 
                  key={item.circuit} 
                  className={cn(
                    "border-t border-border hover:bg-muted/30",
                    index % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                >
                  <td className="px-2 py-1 font-medium">
                    <div className="flex items-center gap-1">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.cableType.color }}
                      />
                      {item.circuit}
                    </div>
                  </td>
                  <td className="px-2 py-1 truncate max-w-[80px]" title={item.cableType.name}>
                    {item.cableType.shortName}
                  </td>
                  <td className="px-2 py-1 text-right">{item.liveLength.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right">{item.neutralLength.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right">{item.earthLength.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right font-medium">{item.totalLength.toFixed(1)}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="border-t-2 border-border bg-muted/50 font-medium">
                <td className="px-2 py-1" colSpan={5}>TOTAL</td>
                <td className="px-2 py-1 text-right">{totalCableLength.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cable Quantity Summary */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-muted/50 px-2 py-1.5 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cable Quantity Summary
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Cable Type</th>
                <th className="px-2 py-1 text-left font-medium">Size</th>
                <th className="px-2 py-1 text-right font-medium">Total (m)</th>
                <th className="px-2 py-1 text-right font-medium">Reels</th>
              </tr>
            </thead>
            <tbody>
              {quantitySummary.map((item, index) => (
                <tr 
                  key={item.cableType.id} 
                  className={cn(
                    "border-t border-border hover:bg-muted/30",
                    index % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                >
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.cableType.color }}
                      />
                      {item.cableType.shortName}
                    </div>
                  </td>
                  <td className="px-2 py-1">{item.cableType.live.size}mm²</td>
                  <td className="px-2 py-1 text-right">{item.totalLength.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right">{item.reelsRequired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Circuit Legend */}
      <div className="px-2 py-1.5 bg-muted/30 rounded-md">
        <span className="text-[9px] text-muted-foreground">
          Circuits: {takeoffItems.map(i => i.circuit).join(', ')}
        </span>
      </div>
    </div>
  );

  // If onToggle is provided, wrap in collapsible
  if (onToggle !== undefined) {
    return (
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Cable className="h-3 w-3" />
            <span className="text-xs font-medium">Cable Schedule</span>
          </div>
          <Badge variant="outline" className="h-5 text-[10px]">
            {takeoffItems.length} circuits
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}

export default CableSchedule;
