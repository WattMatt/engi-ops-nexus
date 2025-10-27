import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MousePointer,
  Hand,
  Ruler,
  RotateCw,
  Magnet,
  Minus,
  Square,
  Zap,
  Home,
  Lightbulb,
  Power,
  Camera,
  Globe,
  Fan,
  Wind,
  Box,
  Circle,
  HardDrive,
  Phone,
  Tv,
  Eye,
  Droplet,
  Navigation,
} from "lucide-react";
import { Tool, DesignPurpose } from "./types";

interface ToolbarProps {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  designPurpose: DesignPurpose;
  rotation: number;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

export const Toolbar = ({
  activeTool,
  onToolSelect,
  designPurpose,
  rotation,
  snapEnabled,
  onToggleSnap,
}: ToolbarProps) => {
  const ToolButton = ({ tool, icon: Icon, label }: { tool: Tool; icon: any; label: string }) => (
    <Button
      variant={activeTool === tool ? "default" : "outline"}
      size="sm"
      onClick={() => onToolSelect(tool)}
      title={label}
      className="w-full justify-start"
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted text-xs">
          <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
          <TabsTrigger value="drawing" className="text-xs">Drawing</TabsTrigger>
          <TabsTrigger value="containment" className="text-xs">Contain</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-2 mt-4">
          <ToolButton tool="select" icon={MousePointer} label="Select" />
          <ToolButton tool="pan" icon={Hand} label="Pan (Alt+Drag)" />
          <ToolButton tool="scale" icon={Ruler} label="Set Scale" />
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToolSelect("rotate")}
              className="w-full justify-start"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Rotate Symbol
              {rotation > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {rotation}°
                </Badge>
              )}
            </Button>
          </div>
          {designPurpose === "pv_design" && (
            <Button
              variant={snapEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleSnap}
              className="w-full justify-start"
            >
              <Magnet className="h-4 w-4 mr-2" />
              Snapping {snapEnabled ? "On" : "Off"}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="drawing" className="space-y-2 mt-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Lines & Routes</div>
          <ToolButton tool="line-mv" icon={Minus} label="Line (MV)" />
          <ToolButton tool="line-lv" icon={Minus} label="Line (LV / AC)" />
          <ToolButton tool="line-dc" icon={Minus} label="Line (DC)" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Zones & Areas</div>
          <ToolButton tool="zone" icon={Square} label="Supply Zone" />
          {designPurpose === "pv_design" && (
            <>
              <ToolButton tool="roof-mask" icon={Square} label="Draw Roof Mask" />
              <ToolButton tool="pv-array" icon={Box} label="Place PV Array" />
            </>
          )}
        </TabsContent>

        <TabsContent value="containment" className="space-y-2 mt-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Cable Management</div>
          <ToolButton tool="cable-tray" icon={Minus} label="Cable Tray" />
          <ToolButton tool="telkom-basket" icon={Minus} label="Telkom Basket" />
          <ToolButton tool="security-basket" icon={Minus} label="Security Basket" />
          <div className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Trunking Systems</div>
          <ToolButton tool="sleeves" icon={Minus} label="Sleeves" />
          <ToolButton tool="powerskirting" icon={Minus} label="Powerskirting" />
          <ToolButton tool="p2000" icon={Minus} label="P2000 Trunking" />
          <ToolButton tool="p8000" icon={Minus} label="P8000 Trunking" />
          <ToolButton tool="p9000" icon={Minus} label="P9000 Trunking" />
        </TabsContent>

        <TabsContent value="equipment" className="space-y-2 mt-4">
          {(designPurpose === "budget_markup" || designPurpose === "general") && (
            <>
              <div className="text-xs font-semibold text-muted-foreground mb-2">High-Level Equipment</div>
              <ToolButton tool="rmu" icon={Box} label="Ring Main Unit" />
              <ToolButton tool="miniature-substation" icon={HardDrive} label="Miniature Substation" />
              <ToolButton tool="main-board" icon={Zap} label="Main Board" />
              <ToolButton tool="sub-board" icon={Zap} label="Sub Board" />
              <ToolButton tool="generator" icon={Power} label="Generator" />
              <ToolButton tool="pole-light" icon={Lightbulb} label="Pole Light" />
            </>
          )}
          
          {designPurpose === "pv_design" && (
            <>
              <div className="text-xs font-semibold text-muted-foreground mb-2">PV Equipment</div>
              <ToolButton tool="inverter" icon={Zap} label="Inverter" />
              <ToolButton tool="dc-combiner-box" icon={Box} label="DC Combiner Box" />
              <ToolButton tool="ac-disconnect" icon={Power} label="AC Disconnect" />
            </>
          )}

          {(designPurpose === "line_shop" || designPurpose === "general") && (
            <>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Lighting & Switches</div>
              <ToolButton tool="light-switch" icon={Circle} label="Light Switch" />
              <ToolButton tool="dimmer-switch" icon={Circle} label="Dimmer Switch" />
              <ToolButton tool="two-way-switch" icon={Circle} label="2-Way Switch" />
              <ToolButton tool="watertight-switch" icon={Droplet} label="Watertight Switch" />
              <ToolButton tool="motion-sensor" icon={Eye} label="Motion Sensor" />
              <ToolButton tool="led-strip" icon={Minus} label="LED Strip Light" />
              <ToolButton tool="ceiling-light" icon={Lightbulb} label="Ceiling Light" />
              <ToolButton tool="wall-light" icon={Lightbulb} label="Wall Light" />
              <ToolButton tool="recessed-600x600" icon={Square} label="600x600 Recessed" />
              <ToolButton tool="recessed-1200x600" icon={Square} label="1200x600 Recessed" />
              <ToolButton tool="floodlight" icon={Lightbulb} label="Floodlight" />
              <ToolButton tool="photo-cell" icon={Circle} label="Photo Cell" />
              
              <div className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Sockets & Outlets</div>
              <ToolButton tool="16a-socket" icon={Power} label="16A Socket" />
              <ToolButton tool="double-socket" icon={Power} label="Double Socket" />
              <ToolButton tool="clean-power-outlet" icon={Power} label="Clean Power" />
              <ToolButton tool="ups-socket" icon={Power} label="UPS Socket" />
              <ToolButton tool="emergency-socket" icon={Power} label="Emergency Socket" />
              <ToolButton tool="data-outlet" icon={Globe} label="Data Outlet" />
              <ToolButton tool="telephone-outlet" icon={Phone} label="Telephone" />
              <ToolButton tool="single-phase-outlet" icon={Zap} label="Single Phase" />
              <ToolButton tool="three-phase-outlet" icon={Zap} label="Three Phase" />
              <ToolButton tool="tv-outlet" icon={Tv} label="TV Outlet" />
              <ToolButton tool="flush-floor-outlet" icon={Square} label="Flush Floor" />
              
              <div className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Other Services</div>
              <ToolButton tool="distribution-board" icon={HardDrive} label="Distribution Board" />
              <ToolButton tool="cctv" icon={Camera} label="CCTV Camera" />
              <ToolButton tool="manhole" icon={Square} label="Manhole" />
              <ToolButton tool="drawbox-50mm" icon={Navigation} label="Drawbox 50mm" />
              <ToolButton tool="drawbox-100mm" icon={Navigation} label="Drawbox 100mm" />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
