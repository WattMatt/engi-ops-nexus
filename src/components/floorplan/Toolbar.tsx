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
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="drawing">Drawing</TabsTrigger>
          <TabsTrigger value="containment">Containment</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-2 mt-4">
          <ToolButton tool="select" icon={MousePointer} label="Select" />
          <ToolButton tool="pan" icon={Hand} label="Pan" />
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
          <ToolButton tool="line-mv" icon={Minus} label="Line (MV)" />
          <ToolButton tool="line-lv" icon={Minus} label="Line (LV / AC)" />
          <ToolButton tool="line-dc" icon={Minus} label="Line (DC)" />
          <ToolButton tool="zone" icon={Square} label="Supply Zone" />
          {designPurpose === "pv_design" && (
            <>
              <ToolButton tool="roof-mask" icon={Square} label="Draw Roof Mask" />
              <ToolButton tool="pv-array" icon={Box} label="Place PV Array" />
            </>
          )}
        </TabsContent>

        <TabsContent value="containment" className="space-y-2 mt-4">
          <ToolButton tool="cable-tray" icon={Minus} label="Cable Tray" />
          <ToolButton tool="telkom-basket" icon={Minus} label="Telkom Basket" />
          <ToolButton tool="security-basket" icon={Minus} label="Security Basket" />
          <ToolButton tool="sleeves" icon={Minus} label="Sleeves" />
          <ToolButton tool="powerskirting" icon={Minus} label="Powerskirting" />
          <ToolButton tool="p2000" icon={Minus} label="P2000 Trunking" />
          <ToolButton tool="p8000" icon={Minus} label="P8000 Trunking" />
          <ToolButton tool="p9000" icon={Minus} label="P9000 Trunking" />
        </TabsContent>

        <TabsContent value="equipment" className="space-y-2 mt-4">
          <ToolButton tool="main-board" icon={Zap} label="Main Board" />
          <ToolButton tool="sub-board" icon={Zap} label="Sub Board" />
          <ToolButton tool="generator" icon={Power} label="Generator" />
          <ToolButton tool="inverter" icon={Power} label="Inverter" />
          <ToolButton tool="light-switch" icon={Lightbulb} label="Light Switch" />
          <ToolButton tool="double-socket" icon={Power} label="Double Socket" />
          <ToolButton tool="single-socket" icon={Power} label="Single Socket" />
          <ToolButton tool="cctv" icon={Camera} label="CCTV Camera" />
          <ToolButton tool="data-outlet" icon={Globe} label="Data Outlet" />
          <ToolButton tool="light-point" icon={Lightbulb} label="Light Point" />
          <ToolButton tool="emergency-light" icon={Lightbulb} label="Emergency Light" />
          <ToolButton tool="fan" icon={Fan} label="Fan" />
          <ToolButton tool="air-conditioner" icon={Wind} label="Air Conditioner" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
