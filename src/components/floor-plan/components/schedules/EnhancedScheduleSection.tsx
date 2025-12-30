import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EquipmentItem, Containment, EquipmentType, ContainmentType } from '../../types';
import { 
  FIXTURE_TYPE_MARKS, 
  LIGHTING_TYPE_MARKS, 
  EQUIPMENT_TYPE_MARKS,
  CONDUIT_OUTER_DIAMETERS,
  EnhancedScheduleItem,
  ConduitScheduleItem,
} from './schedule-types';

// ==================== ELECTRICAL FIXTURE SCHEDULE ====================
interface ElectricalFixtureScheduleProps {
  equipment: EquipmentItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

const ELECTRICAL_FIXTURE_TYPES = [
  EquipmentType.SOCKET_16A,
  EquipmentType.SOCKET_DOUBLE,
  EquipmentType.EMERGENCY_SOCKET,
  EquipmentType.UPS_SOCKET,
  EquipmentType.CLEAN_POWER_OUTLET,
  EquipmentType.SINGLE_PHASE_OUTLET,
  EquipmentType.THREE_PHASE_OUTLET,
  EquipmentType.SOCKET_16A_TP,
  EquipmentType.GEYSER_OUTLET,
  EquipmentType.FLUSH_FLOOR_OUTLET,
  EquipmentType.BOX_FLUSH_FLOOR,
  EquipmentType.WORKSTATION_OUTLET,
  EquipmentType.DATA_SOCKET,
  EquipmentType.TELEPHONE_OUTLET,
  EquipmentType.TV_OUTLET,
  EquipmentType.CCTV_CAMERA,
];

export function ElectricalFixtureSchedule({ equipment, isExpanded, onToggle }: ElectricalFixtureScheduleProps) {
  const fixtureSchedule = useMemo(() => {
    const fixtureMap = new Map<string, EnhancedScheduleItem>();
    
    equipment
      .filter(item => ELECTRICAL_FIXTURE_TYPES.includes(item.type))
      .forEach(item => {
        const typeInfo = FIXTURE_TYPE_MARKS[item.type];
        const key = item.type;
        
        if (fixtureMap.has(key)) {
          const existing = fixtureMap.get(key)!;
          existing.count++;
        } else {
          fixtureMap.set(key, {
            id: key,
            typeMark: typeInfo?.mark || 'FX',
            type: item.type,
            description: typeInfo?.description || item.type,
            count: 1,
            category: typeInfo?.category || 'General',
          });
        }
      });

    return Array.from(fixtureMap.values()).sort((a, b) => {
      // Sort by type mark (F1, F2, etc., then D1, D2, etc.)
      const aPrefix = a.typeMark.charAt(0);
      const bPrefix = b.typeMark.charAt(0);
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      const aNum = parseInt(a.typeMark.slice(1)) || 0;
      const bNum = parseInt(b.typeMark.slice(1)) || 0;
      return aNum - bNum;
    });
  }, [equipment]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, EnhancedScheduleItem[]> = {};
    fixtureSchedule.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [fixtureSchedule]);

  if (fixtureSchedule.length === 0) return null;

  const totalFixtures = fixtureSchedule.reduce((sum, item) => sum + item.count, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">Electrical Fixture Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">{totalFixtures}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold w-12">Mark</th>
                <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                <th className="px-2 py-1.5 text-center font-semibold w-12">Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByCategory).map(([category, items]) => (
                <React.Fragment key={category}>
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-2 py-1 font-semibold text-[9px] uppercase text-muted-foreground">
                      {category} Fixtures
                    </td>
                  </tr>
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                    >
                      <td className="px-2 py-1 font-medium text-primary">{item.typeMark}</td>
                      <td className="px-2 py-1 text-[9px]" title={item.description}>{item.description}</td>
                      <td className="px-2 py-1 text-center font-medium">{item.count}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-2 py-1.5" colSpan={2}>Total Fixtures</td>
                <td className="px-2 py-1.5 text-center">{totalFixtures}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==================== ELECTRICAL EQUIPMENT SCHEDULE ====================
interface ElectricalEquipmentScheduleProps {
  equipment: EquipmentItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

const DISTRIBUTION_EQUIPMENT_TYPES = [
  EquipmentType.DISTRIBUTION_BOARD,
  EquipmentType.MAIN_BOARD,
  EquipmentType.SUB_BOARD,
  EquipmentType.RMU,
  EquipmentType.SUBSTATION,
  EquipmentType.GENERATOR,
  EquipmentType.TELEPHONE_BOARD,
];

export function ElectricalEquipmentSchedule({ equipment, isExpanded, onToggle }: ElectricalEquipmentScheduleProps) {
  const equipmentSchedule = useMemo(() => {
    const equipMap = new Map<string, EnhancedScheduleItem & { items: EquipmentItem[] }>();
    let panelCounter = 1;
    
    equipment
      .filter(item => DISTRIBUTION_EQUIPMENT_TYPES.includes(item.type))
      .forEach(item => {
        const typeInfo = EQUIPMENT_TYPE_MARKS[item.type];
        const key = item.type;
        
        if (equipMap.has(key)) {
          const existing = equipMap.get(key)!;
          existing.count++;
          existing.items.push(item);
        } else {
          equipMap.set(key, {
            id: key,
            typeMark: typeInfo?.mark || 'EQ',
            type: item.type,
            description: typeInfo?.description || item.type,
            count: 1,
            rating: typeInfo?.rating,
            panelName: `${typeInfo?.mark || 'EQ'}-${String(panelCounter++).padStart(2, '0')}`,
            items: [item],
          });
        }
      });

    return Array.from(equipMap.values());
  }, [equipment]);

  if (equipmentSchedule.length === 0) return null;

  const totalEquipment = equipmentSchedule.reduce((sum, item) => sum + item.count, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">Electrical Equipment Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">{totalEquipment}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold w-12">Mark</th>
                <th className="px-2 py-1.5 text-left font-semibold w-16">Panel</th>
                <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                <th className="px-2 py-1.5 text-center font-semibold w-14">Rating</th>
                <th className="px-2 py-1.5 text-center font-semibold w-10">Qty</th>
              </tr>
            </thead>
            <tbody>
              {equipmentSchedule.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <td className="px-2 py-1 font-medium text-primary">{item.typeMark}</td>
                  <td className="px-2 py-1 font-mono text-[9px]">{item.panelName}</td>
                  <td className="px-2 py-1 text-[9px]" title={item.description}>{item.description}</td>
                  <td className="px-2 py-1 text-center text-[9px]">{item.rating || '-'}</td>
                  <td className="px-2 py-1 text-center font-medium">{item.count}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-2 py-1.5" colSpan={4}>Total Equipment</td>
                <td className="px-2 py-1.5 text-center">{totalEquipment}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==================== LIGHTING FIXTURE SCHEDULE ====================
interface LightingFixtureScheduleProps {
  equipment: EquipmentItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

const LIGHTING_FIXTURE_TYPES = [
  EquipmentType.RECESSED_LIGHT_600,
  EquipmentType.RECESSED_LIGHT_1200,
  EquipmentType.CEILING_LIGHT,
  EquipmentType.LED_STRIP_LIGHT,
  EquipmentType.FLUORESCENT_2_TUBE,
  EquipmentType.FLUORESCENT_1_TUBE,
  EquipmentType.CEILING_FLOODLIGHT,
  EquipmentType.WALL_MOUNTED_LIGHT,
  EquipmentType.POLE_MOUNTED_LIGHT,
  EquipmentType.FLOODLIGHT,
];

export function LightingFixtureSchedule({ equipment, isExpanded, onToggle }: LightingFixtureScheduleProps) {
  const lightingSchedule = useMemo(() => {
    const lightMap = new Map<string, EnhancedScheduleItem>();
    
    equipment
      .filter(item => LIGHTING_FIXTURE_TYPES.includes(item.type))
      .forEach(item => {
        const typeInfo = LIGHTING_TYPE_MARKS[item.type];
        const key = item.type;
        
        if (lightMap.has(key)) {
          const existing = lightMap.get(key)!;
          existing.count++;
        } else {
          lightMap.set(key, {
            id: key,
            typeMark: typeInfo?.mark || 'L',
            type: item.type,
            description: typeInfo?.description || item.type,
            count: 1,
            wattage: typeInfo?.wattage,
            lumens: typeInfo?.lumens,
            cct: typeInfo?.cct,
          });
        }
      });

    return Array.from(lightMap.values()).sort((a, b) => a.typeMark.localeCompare(b.typeMark));
  }, [equipment]);

  if (lightingSchedule.length === 0) return null;

  const totalLights = lightingSchedule.reduce((sum, item) => sum + item.count, 0);
  const totalWattage = lightingSchedule.reduce((sum, item) => sum + (item.count * (item.wattage || 0)), 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">Lighting Fixture Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">{totalLights}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-1.5 py-1.5 text-left font-semibold w-8">Mark</th>
                <th className="px-1.5 py-1.5 text-left font-semibold">Description</th>
                <th className="px-1.5 py-1.5 text-center font-semibold w-10">W</th>
                <th className="px-1.5 py-1.5 text-center font-semibold w-12">lm</th>
                <th className="px-1.5 py-1.5 text-center font-semibold w-10">Qty</th>
              </tr>
            </thead>
            <tbody>
              {lightingSchedule.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <td className="px-1.5 py-1 font-bold text-amber-600">{item.typeMark}</td>
                  <td className="px-1.5 py-1 text-[9px]" title={item.description}>{item.description}</td>
                  <td className="px-1.5 py-1 text-center text-[9px]">{item.wattage || '-'}</td>
                  <td className="px-1.5 py-1 text-center text-[9px]">{item.lumens || '-'}</td>
                  <td className="px-1.5 py-1 text-center font-medium">{item.count}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-1.5 py-1.5" colSpan={2}>Total Lighting</td>
                <td className="px-1.5 py-1.5 text-center text-[9px]">{totalWattage}W</td>
                <td className="px-1.5 py-1.5 text-center">-</td>
                <td className="px-1.5 py-1.5 text-center">{totalLights}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==================== CONDUIT RUN SCHEDULE ====================
interface ConduitRunScheduleProps {
  containment: Containment[];
  isExpanded: boolean;
  onToggle: () => void;
}

const CONDUIT_TYPES = [
  ContainmentType.CONDUIT_20MM,
  ContainmentType.CONDUIT_25MM,
  ContainmentType.CONDUIT_32MM,
  ContainmentType.CONDUIT_40MM,
  ContainmentType.CONDUIT_50MM,
];

export function ConduitRunSchedule({ containment, isExpanded, onToggle }: ConduitRunScheduleProps) {
  const conduitSchedule = useMemo(() => {
    const conduitMap = new Map<string, ConduitScheduleItem>();
    
    containment
      .filter(item => CONDUIT_TYPES.includes(item.type))
      .forEach(item => {
        const key = item.type;
        const odInfo = CONDUIT_OUTER_DIAMETERS[item.type];
        const lengthInMeters = item.length / 1000; // Convert mm to m
        
        if (conduitMap.has(key)) {
          const existing = conduitMap.get(key)!;
          existing.count++;
          existing.totalLength += lengthInMeters;
        } else {
          // Determine conduit type (Steel, PVC, Flexible)
          const conduitType = item.size?.toLowerCase().includes('pvc') ? 'PVC' 
            : item.size?.toLowerCase().includes('flex') ? 'Flexible' 
            : 'Steel';
          
          const sizeMatch = item.type.match(/(\d+)mm/);
          const innerDiameter = sizeMatch ? parseInt(sizeMatch[1]) : 20;
          
          conduitMap.set(key, {
            id: key,
            typeMark: `C${innerDiameter}`,
            type: item.type,
            description: `${innerDiameter}mm ${conduitType} Conduit`,
            count: 1,
            conduitType,
            innerDiameter,
            outerDiameter: odInfo?.od || innerDiameter + 3,
            totalLength: lengthInMeters,
          });
        }
      });

    return Array.from(conduitMap.values()).sort((a, b) => a.innerDiameter - b.innerDiameter);
  }, [containment]);

  // Group by conduit type
  const groupedByType = useMemo(() => {
    const groups: Record<string, ConduitScheduleItem[]> = {};
    conduitSchedule.forEach(item => {
      if (!groups[item.conduitType]) groups[item.conduitType] = [];
      groups[item.conduitType].push(item);
    });
    return groups;
  }, [conduitSchedule]);

  if (conduitSchedule.length === 0) return null;

  const totalLength = conduitSchedule.reduce((sum, item) => sum + item.totalLength, 0);
  const totalRuns = conduitSchedule.reduce((sum, item) => sum + item.count, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">Conduit Run Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">{totalRuns}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold w-10">Mark</th>
                <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                <th className="px-2 py-1.5 text-center font-semibold w-10">ID</th>
                <th className="px-2 py-1.5 text-center font-semibold w-10">OD</th>
                <th className="px-2 py-1.5 text-center font-semibold w-12">Runs</th>
                <th className="px-2 py-1.5 text-right font-semibold w-14">Length</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByType).map(([conduitType, items]) => (
                <React.Fragment key={conduitType}>
                  <tr className="bg-muted/30">
                    <td colSpan={6} className="px-2 py-1 font-semibold text-[9px] uppercase text-muted-foreground">
                      {conduitType} Conduit
                    </td>
                  </tr>
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                    >
                      <td className="px-2 py-1 font-medium text-primary">{item.typeMark}</td>
                      <td className="px-2 py-1 text-[9px]">{item.description}</td>
                      <td className="px-2 py-1 text-center text-[9px]">{item.innerDiameter}mm</td>
                      <td className="px-2 py-1 text-center text-[9px]">{item.outerDiameter}mm</td>
                      <td className="px-2 py-1 text-center">{item.count}</td>
                      <td className="px-2 py-1 text-right font-mono">{item.totalLength.toFixed(1)}m</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-2 py-1.5" colSpan={4}>Total Conduit</td>
                <td className="px-2 py-1.5 text-center">{totalRuns}</td>
                <td className="px-2 py-1.5 text-right font-mono">{totalLength.toFixed(1)}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==================== CONTAINMENT SCHEDULE (Trunking, Trays, etc.) ====================
interface ContainmentScheduleProps {
  containment: Containment[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function ContainmentSchedule({ containment, isExpanded, onToggle }: ContainmentScheduleProps) {
  const containmentSchedule = useMemo(() => {
    const containMap = new Map<string, EnhancedScheduleItem & { totalLength: number }>();
    
    // Filter out conduits - they have their own schedule
    containment
      .filter(item => !CONDUIT_TYPES.includes(item.type))
      .forEach(item => {
        const key = `${item.type}-${item.size}`;
        const lengthInMeters = item.length / 1000;
        
        if (containMap.has(key)) {
          const existing = containMap.get(key)!;
          existing.count++;
          existing.totalLength += lengthInMeters;
        } else {
          // Generate type mark based on containment type
          let mark = 'CT';
          if (item.type.includes('Tray')) mark = 'TR';
          else if (item.type.includes('Basket')) mark = 'WB';
          else if (item.type.includes('Trunking')) mark = 'TK';
          else if (item.type.includes('Powerskirting')) mark = 'PS';
          
          containMap.set(key, {
            id: key,
            typeMark: mark,
            type: item.type,
            description: `${item.type} - ${item.size}`,
            count: 1,
            totalLength: lengthInMeters,
          });
        }
      });

    return Array.from(containMap.values());
  }, [containment]);

  if (containmentSchedule.length === 0) return null;

  const totalLength = containmentSchedule.reduce((sum, item) => sum + item.totalLength, 0);
  const totalRuns = containmentSchedule.reduce((sum, item) => sum + item.count, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">Containment Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">{totalRuns}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold w-10">Mark</th>
                <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                <th className="px-2 py-1.5 text-center font-semibold w-12">Runs</th>
                <th className="px-2 py-1.5 text-right font-semibold w-14">Length</th>
              </tr>
            </thead>
            <tbody>
              {containmentSchedule.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                >
                  <td className="px-2 py-1 font-medium text-primary">{item.typeMark}</td>
                  <td className="px-2 py-1 text-[9px]">{item.description}</td>
                  <td className="px-2 py-1 text-center">{item.count}</td>
                  <td className="px-2 py-1 text-right font-mono">{item.totalLength.toFixed(1)}m</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-2 py-1.5" colSpan={2}>Total Containment</td>
                <td className="px-2 py-1.5 text-center">{totalRuns}</td>
                <td className="px-2 py-1.5 text-right font-mono">{totalLength.toFixed(1)}m</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
