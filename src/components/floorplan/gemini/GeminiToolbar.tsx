import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MousePointer2, Move, Ruler, Minus, Circle, Square,
  Zap, Sun, Home, Building2, Factory, Lightbulb,
  Cable, Grip, ChevronDown, ChevronUp
} from "lucide-react";
import { DesignPurpose, Tool, EquipmentType } from "./types";
import { getAvailableTools, getAvailableEquipment } from "./designPurposeConfig";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GeminiToolbarProps {
  designPurpose: DesignPurpose;
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  snapEnabled: boolean;
  onToggleSnap: (enabled: boolean) => void;
}

export const GeminiToolbar = ({
  designPurpose,
  activeTool,
  onToolSelect,
  rotation,
  onRotationChange,
  snapEnabled,
  onToggleSnap,
}: GeminiToolbarProps) => {
  const [generalOpen, setGeneralOpen] = useState(true);
  const [drawingOpen, setDrawingOpen] = useState(true);
  const [containmentOpen, setContainmentOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);

  const availableTools = getAvailableTools(designPurpose);
  const availableEquipment = getAvailableEquipment(designPurpose);

  const isToolAvailable = (tool: Tool) => availableTools.includes(tool);

  const ToolButton = ({ tool, icon: Icon, label }: { tool: Tool; icon: any; label: string }) => {
    if (!isToolAvailable(tool)) return null;
    
    return (
      <Button
        variant={activeTool === tool ? "default" : "outline"}
        size="sm"
        className="w-full justify-start"
        onClick={() => onToolSelect(tool)}
      >
        <Icon className="h-4 w-4 mr-2" />
        {label}
      </Button>
    );
  };

  const EquipmentButton = ({ type, label }: { type: EquipmentType; label: string }) => {
    return (
      <Button
        variant={activeTool === type ? "default" : "outline"}
        size="sm"
        className="w-full justify-start text-xs"
        onClick={() => onToolSelect(type)}
      >
        <Circle className="h-3 w-3 mr-2" />
        {label}
      </Button>
    );
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* General Tools */}
          <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-sm">General</h3>
              {generalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ToolButton tool="select" icon={MousePointer2} label="Select" />
              <ToolButton tool="pan" icon={Move} label="Pan" />
              <ToolButton tool="scale" icon={Ruler} label="Set Scale" />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Drawing Tools */}
          <Collapsible open={drawingOpen} onOpenChange={setDrawingOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-sm">Drawing</h3>
              {drawingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ToolButton tool="line-mv" icon={Zap} label="MV Line" />
              <ToolButton tool="line-lv" icon={Zap} label="LV Line" />
              <ToolButton tool="line-dc" icon={Sun} label="DC Line" />
              <ToolButton tool="line-ac" icon={Zap} label="AC Line" />
              <ToolButton tool="zone" icon={Square} label="Supply Zone" />
              <ToolButton tool="exclusion-zone" icon={Square} label="Exclusion Zone" />
              <ToolButton tool="roof-mask" icon={Home} label="Roof Mask" />
              <ToolButton tool="pv-array" icon={Sun} label="PV Array" />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Containment */}
          <Collapsible open={containmentOpen} onOpenChange={setContainmentOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h3 className="font-semibold text-sm">Containment</h3>
              {containmentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <ToolButton tool="cable-tray" icon={Grip} label="Cable Tray" />
              <ToolButton tool="telkom-basket" icon={Grip} label="Telkom Basket" />
              <ToolButton tool="security-basket" icon={Grip} label="Security Basket" />
              <ToolButton tool="sleeves" icon={Cable} label="Sleeves" />
              <ToolButton tool="powerskirting" icon={Minus} label="Power Skirting" />
              <ToolButton tool="p2000" icon={Square} label="P2000 Trunking" />
              <ToolButton tool="p8000" icon={Square} label="P8000 Trunking" />
              <ToolButton tool="p9000" icon={Square} label="P9000 Trunking" />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Equipment */}
          {availableEquipment.length > 0 && (
            <>
              <Collapsible open={equipmentOpen} onOpenChange={setEquipmentOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-sm">Equipment</h3>
                  {equipmentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {availableEquipment.map(eq => (
                    <EquipmentButton 
                      key={eq} 
                      type={eq} 
                      label={eq.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} 
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Separator />
            </>
          )}

          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Rotation: {rotation}°</Label>
              <Slider
                value={[rotation]}
                onValueChange={([v]) => onRotationChange(v)}
                min={0}
                max={360}
                step={15}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Snap to Grid</Label>
              <Switch checked={snapEnabled} onCheckedChange={onToggleSnap} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
