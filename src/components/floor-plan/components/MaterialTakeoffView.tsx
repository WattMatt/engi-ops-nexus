import React, { useMemo, useState } from 'react';
import { 
  FileDown, Package, Cable, Zap, 
  ChevronDown, ChevronRight, Calculator,
  Download, FileSpreadsheet, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EquipmentItem, SupplyLine, Containment, EquipmentType, ContainmentType, ScaleInfo } from '../types';
import { CABLE_TYPES, CableTypeDefinition } from './cable-types';

// Category mappings for equipment
const EQUIPMENT_CATEGORIES: Record<string, { label: string; types: EquipmentType[] }> = {
  lighting: {
    label: 'Lighting & Switches',
    types: [
      EquipmentType.GENERAL_LIGHT_SWITCH, EquipmentType.DIMMER_SWITCH,
      EquipmentType.TWO_WAY_LIGHT_SWITCH, EquipmentType.WATERTIGHT_LIGHT_SWITCH,
      EquipmentType.LED_STRIP_LIGHT, EquipmentType.FLUORESCENT_2_TUBE,
      EquipmentType.FLUORESCENT_1_TUBE, EquipmentType.CEILING_FLOODLIGHT,
      EquipmentType.CEILING_LIGHT, EquipmentType.POLE_MOUNTED_LIGHT,
      EquipmentType.WALL_MOUNTED_LIGHT, EquipmentType.RECESSED_LIGHT_600,
      EquipmentType.RECESSED_LIGHT_1200, EquipmentType.FLOODLIGHT,
      EquipmentType.PHOTO_CELL, EquipmentType.MOTION_SENSOR,
    ],
  },
  power: {
    label: 'Power Outlets',
    types: [
      EquipmentType.SOCKET_16A, EquipmentType.SOCKET_DOUBLE,
      EquipmentType.EMERGENCY_SOCKET, EquipmentType.UPS_SOCKET,
      EquipmentType.SINGLE_PHASE_OUTLET, EquipmentType.THREE_PHASE_OUTLET,
      EquipmentType.SOCKET_16A_TP, EquipmentType.GEYSER_OUTLET,
      EquipmentType.FLUSH_FLOOR_OUTLET, EquipmentType.BOX_FLUSH_FLOOR,
      EquipmentType.CLEAN_POWER_OUTLET, EquipmentType.WORKSTATION_OUTLET,
    ],
  },
  data: {
    label: 'Data & Communications',
    types: [
      EquipmentType.DATA_SOCKET, EquipmentType.TELEPHONE_OUTLET,
      EquipmentType.TV_OUTLET, EquipmentType.TELEPHONE_BOARD,
      EquipmentType.CCTV_CAMERA,
    ],
  },
  distribution: {
    label: 'Distribution Equipment',
    types: [
      EquipmentType.DISTRIBUTION_BOARD, EquipmentType.MAIN_BOARD,
      EquipmentType.SUB_BOARD, EquipmentType.RMU,
      EquipmentType.SUBSTATION, EquipmentType.GENERATOR,
    ],
  },
  other: {
    label: 'Accessories',
    types: [
      EquipmentType.DRAWBOX_50, EquipmentType.DRAWBOX_100,
      EquipmentType.AC_CONTROLLER_BOX, EquipmentType.BREAK_GLASS_UNIT,
      EquipmentType.MANHOLE,
    ],
  },
};

interface TakeoffSummary {
  category: string;
  label: string;
  items: { type: string; description: string; count: number; unit: string }[];
  totalCount: number;
}

interface CableSummary {
  cableType: string;
  size: string;
  totalLength: number;
  reels: number;
  unit: string;
}

interface ContainmentSummary {
  type: string;
  size: string;
  totalLength: number;
  unit: string;
}

interface MaterialTakeoffViewProps {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  containment: Containment[];
  scaleInfo: ScaleInfo;
  projectName?: string;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export function MaterialTakeoffView({
  equipment,
  lines,
  containment,
  scaleInfo,
  projectName = 'Project',
  onExportExcel,
  onExportPDF,
}: MaterialTakeoffViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['equipment', 'cables', 'containment'])
  );

  // Equipment takeoff by category
  const equipmentTakeoff = useMemo(() => {
    const summaries: TakeoffSummary[] = [];
    
    for (const [categoryKey, category] of Object.entries(EQUIPMENT_CATEGORIES)) {
      const counts: Record<string, number> = {};
      
      equipment.forEach(item => {
        if (category.types.includes(item.type)) {
          counts[item.type] = (counts[item.type] || 0) + 1;
        }
      });
      
      const items = Object.entries(counts).map(([type, count]) => ({
        type,
        description: type, // The enum value is the display name
        count,
        unit: 'Nr',
      }));
      
      if (items.length > 0) {
        summaries.push({
          category: categoryKey,
          label: category.label,
          items: items.sort((a, b) => a.description.localeCompare(b.description)),
          totalCount: items.reduce((sum, i) => sum + i.count, 0),
        });
      }
    }
    
    return summaries;
  }, [equipment]);

  // Cable takeoff
  const cableTakeoff = useMemo(() => {
    const cableLengths: Record<string, { length: number; cableType: CableTypeDefinition }> = {};
    
    lines.forEach(line => {
      if (line.cableType) {
        const cableTypeDef = CABLE_TYPES[line.cableType];
        if (cableTypeDef) {
          if (!cableLengths[line.cableType]) {
            cableLengths[line.cableType] = { length: 0, cableType: cableTypeDef };
          }
          cableLengths[line.cableType].length += line.length || 0;
        }
      }
    });
    
    const REEL_LENGTH = 100; // meters per reel
    
    return Object.entries(cableLengths).map(([id, data]) => ({
      cableType: data.cableType.name,
      size: data.cableType.live.size,
      totalLength: Math.round(data.length * 10) / 10,
      reels: Math.ceil(data.length / REEL_LENGTH),
      unit: 'm',
    })).sort((a, b) => parseFloat(a.size) - parseFloat(b.size));
  }, [lines]);

  // Containment takeoff
  const containmentTakeoff = useMemo(() => {
    const lengths: Record<string, { length: number; size: string }> = {};
    
    containment.forEach(item => {
      const key = `${item.type}|${item.size}`;
      if (!lengths[key]) {
        lengths[key] = { length: 0, size: item.size };
      }
      lengths[key].length += item.length || 0;
    });
    
    return Object.entries(lengths).map(([key, data]) => {
      const [type] = key.split('|');
      return {
        type,
        size: data.size,
        totalLength: Math.round(data.length * 10) / 10,
        unit: 'm',
      };
    }).sort((a, b) => a.type.localeCompare(b.type));
  }, [containment]);

  // Summary stats
  const totals = useMemo(() => ({
    equipmentItems: equipment.length,
    equipmentTypes: new Set(equipment.map(e => e.type)).size,
    cableLength: cableTakeoff.reduce((sum, c) => sum + c.totalLength, 0),
    cableTypes: cableTakeoff.length,
    containmentLength: containmentTakeoff.reduce((sum, c) => sum + c.totalLength, 0),
    containmentTypes: containmentTakeoff.length,
  }), [equipment, cableTakeoff, containmentTakeoff]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Material Takeoff</h1>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 p-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.equipmentItems}</div>
            <p className="text-xs text-muted-foreground">
              {totals.equipmentTypes} different types
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.cableLength.toFixed(0)}m</div>
            <p className="text-xs text-muted-foreground">
              {totals.cableTypes} cable types
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cable className="h-4 w-4" />
              Containment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.containmentLength.toFixed(0)}m</div>
            <p className="text-xs text-muted-foreground">
              {totals.containmentTypes} containment types
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Takeoff Tables */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-4">
          {/* Equipment Section */}
          <Collapsible 
            open={expandedSections.has('equipment')}
            onOpenChange={() => toggleSection('equipment')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {expandedSections.has('equipment') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Package className="h-5 w-5 text-primary" />
                      Equipment Schedule
                    </CardTitle>
                    <Badge variant="secondary">{totals.equipmentItems} items</Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {equipmentTakeoff.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No equipment placed on layout
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {equipmentTakeoff.map(category => (
                        <div key={category.category}>
                          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                            {category.label}
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[80px] text-right">Qty</TableHead>
                                <TableHead className="w-[60px]">Unit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.items.map((item, idx) => (
                                <TableRow key={item.type}>
                                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right font-medium">{item.count}</TableCell>
                                  <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Separator className="mt-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          
          {/* Cable Section */}
          <Collapsible 
            open={expandedSections.has('cables')}
            onOpenChange={() => toggleSection('cables')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {expandedSections.has('cables') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Zap className="h-5 w-5 text-primary" />
                      Cable Schedule
                    </CardTitle>
                    <Badge variant="secondary">{totals.cableLength.toFixed(0)}m total</Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {cableTakeoff.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No cables drawn on layout
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cable Type</TableHead>
                          <TableHead className="w-[80px]">Size</TableHead>
                          <TableHead className="w-[100px] text-right">Length</TableHead>
                          <TableHead className="w-[80px] text-right">Reels</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cableTakeoff.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.cableType}</TableCell>
                            <TableCell className="font-mono">{item.size}</TableCell>
                            <TableCell className="text-right font-medium">{item.totalLength}m</TableCell>
                            <TableCell className="text-right">{item.reels}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          
          {/* Containment Section */}
          <Collapsible 
            open={expandedSections.has('containment')}
            onOpenChange={() => toggleSection('containment')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {expandedSections.has('containment') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Cable className="h-5 w-5 text-primary" />
                      Containment Schedule
                    </CardTitle>
                    <Badge variant="secondary">{totals.containmentLength.toFixed(0)}m total</Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {containmentTakeoff.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No containment drawn on layout
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Containment Type</TableHead>
                          <TableHead className="w-[100px]">Size</TableHead>
                          <TableHead className="w-[100px] text-right">Length</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {containmentTakeoff.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.type}</TableCell>
                            <TableCell className="font-mono">{item.size}</TableCell>
                            <TableCell className="text-right font-medium">{item.totalLength}m</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
