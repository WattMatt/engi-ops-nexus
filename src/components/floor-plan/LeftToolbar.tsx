import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Save, 
  FolderOpen, 
  FileDown, 
  Sparkles,
  MousePointer,
  Move,
  Ruler,
  Type,
  Cable,
  Pentagon,
  Box,
  Grid3x3,
  Settings,
  Navigation
} from 'lucide-react';
import { getToolsForPurpose } from '@/lib/floorPlan/tools';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  MousePointer,
  Move,
  Ruler,
  Type,
  Cable,
  Pentagon,
  Box,
  Grid3x3,
  Settings,
  Navigation,
};

export function LeftToolbar() {
  const { state, updateState } = useFloorPlan();

  const tools = state.designPurpose ? getToolsForPurpose(state.designPurpose) : [];
  
  const generalTools = tools.filter(t => t.category === 'general');
  const drawingTools = tools.filter(t => t.category === 'drawing');
  const containmentTools = tools.filter(t => t.category === 'containment');
  const pvTools = tools.filter(t => t.category === 'pv');

  const handleToolClick = (toolId: string) => {
    updateState({ activeTool: toolId });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full p-2 gap-2">
        {/* Global Actions */}
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Save className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Save to Cloud</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <FolderOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Load from Cloud</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <FileDown className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Export PDF</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sparkles className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">AI Generate BoQ</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* General Tools */}
        {generalTools.length > 0 && (
          <div className="flex flex-col gap-2">
            {generalTools.map(tool => {
              const Icon = iconMap[tool.icon];
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={state.activeTool === tool.id ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => handleToolClick(tool.id)}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{tool.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Drawing Tools */}
        {drawingTools.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {drawingTools.map(tool => {
                const Icon = iconMap[tool.icon];
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => handleToolClick(tool.id)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tool.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </>
        )}

        {/* Containment Tools */}
        {containmentTools.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {containmentTools.map(tool => {
                const Icon = iconMap[tool.icon];
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => handleToolClick(tool.id)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tool.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </>
        )}

        {/* PV Tools */}
        {pvTools.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {pvTools.map(tool => {
                const Icon = iconMap[tool.icon];
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={state.activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => handleToolClick(tool.id)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tool.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
