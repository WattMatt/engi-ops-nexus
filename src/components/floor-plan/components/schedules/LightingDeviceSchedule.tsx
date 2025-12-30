import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, ToggleLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EquipmentItem, EquipmentType } from '../../types';
import { LIGHTING_DEVICE_TYPE_MARKS, EnhancedScheduleItem } from './schedule-types';

interface LightingDeviceScheduleProps {
  equipment: EquipmentItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

// Device types that are lighting devices
const LIGHTING_DEVICE_TYPES = [
  EquipmentType.GENERAL_LIGHT_SWITCH,
  EquipmentType.DIMMER_SWITCH,
  EquipmentType.TWO_WAY_LIGHT_SWITCH,
  EquipmentType.WATERTIGHT_LIGHT_SWITCH,
  EquipmentType.MOTION_SENSOR,
  EquipmentType.PHOTO_CELL,
];

export function LightingDeviceSchedule({ equipment, isExpanded, onToggle }: LightingDeviceScheduleProps) {
  const deviceSchedule = useMemo(() => {
    const deviceMap = new Map<string, EnhancedScheduleItem>();
    
    equipment
      .filter(item => LIGHTING_DEVICE_TYPES.includes(item.type))
      .forEach(item => {
        const typeInfo = LIGHTING_DEVICE_TYPE_MARKS[item.type];
        const key = item.type;
        
        if (deviceMap.has(key)) {
          const existing = deviceMap.get(key)!;
          existing.count++;
        } else {
          deviceMap.set(key, {
            id: key,
            typeMark: typeInfo?.mark || 'LD',
            type: item.type,
            description: typeInfo?.description || item.type,
            count: 1,
            category: typeInfo?.category || 'Device',
          });
        }
      });

    return Array.from(deviceMap.values()).sort((a, b) => a.typeMark.localeCompare(b.typeMark));
  }, [equipment]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, EnhancedScheduleItem[]> = {};
    deviceSchedule.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [deviceSchedule]);

  if (deviceSchedule.length === 0) return null;

  const totalDevices = deviceSchedule.reduce((sum, item) => sum + item.count, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <ToggleLeft className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium">Lighting Device Schedule</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">
          {totalDevices}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border rounded-md overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left font-semibold w-12">Mark</th>
                <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                <th className="px-2 py-1.5 text-center font-semibold w-16">Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByCategory).map(([category, items]) => (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-2 py-1 font-semibold text-[9px] uppercase text-muted-foreground">
                      {category}s
                    </td>
                  </tr>
                  {/* Items in category */}
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-t border-border hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                    >
                      <td className="px-2 py-1 font-medium text-primary">{item.typeMark}</td>
                      <td className="px-2 py-1 text-[9px]" title={item.description}>
                        {item.description}
                      </td>
                      <td className="px-2 py-1 text-center font-medium">{item.count}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {/* Total Row */}
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="px-2 py-1.5" colSpan={2}>Total Devices</td>
                <td className="px-2 py-1.5 text-center">{totalDevices}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
