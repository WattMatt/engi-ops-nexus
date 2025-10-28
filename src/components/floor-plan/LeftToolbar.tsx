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
import { saveFloorPlanToCloud } from '@/lib/floorPlan/cloudStorage';
import { generateFloorPlanPDF } from '@/lib/floorPlan/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { LoadDialog } from './modals/LoadDialog';
import { EquipmentSelector } from './modals/EquipmentSelector';

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
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [equipmentSelectorOpen, setEquipmentSelectorOpen] = useState(false);

  const tools = state.designPurpose ? getToolsForPurpose(state.designPurpose) : [];
  
  const generalTools = tools.filter(t => t.category === 'general');
  const drawingTools = tools.filter(t => t.category === 'drawing');
  const containmentTools = tools.filter(t => t.category === 'containment');
  const pvTools = tools.filter(t => t.category === 'pv');

  const handleToolClick = (toolId: string) => {
    if (toolId === 'equipment') {
      setEquipmentSelectorOpen(true);
    } else {
      updateState({ activeTool: toolId });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Request current state from iframe
      window.dispatchEvent(new CustomEvent('request-iframe-state'));
      
      // Wait for state update event
      const stateHandler = async (event: any) => {
        try {
          const projectName = prompt('Enter project name:') || 'Untitled Floor Plan';
          await saveFloorPlanToCloud(event.detail || state, projectName);
          toast({ title: 'Saved', description: 'Floor plan saved to cloud' });
        } catch (error: any) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
          setSaving(false);
          window.removeEventListener('gemini-studio-save', stateHandler);
        }
      };
      
      window.addEventListener('gemini-studio-save', stateHandler);
      
      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('gemini-studio-save', stateHandler);
        if (saving) {
          setSaving(false);
        }
      }, 5000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  const handleExport = () => {
    // Send export request to iframe
    window.dispatchEvent(new CustomEvent('request-iframe-export'));
    
    // Listen for export data
    const exportHandler = (event: any) => {
      const { dataUrl } = event.detail || {};
      if (dataUrl) {
        generateFloorPlanPDF(state, dataUrl);
        toast({ title: 'Exported', description: 'PDF downloaded' });
      }
      window.removeEventListener('gemini-studio-export', exportHandler);
    };
    
    window.addEventListener('gemini-studio-export', exportHandler);
    
    // Fallback timeout
    setTimeout(() => {
      window.removeEventListener('gemini-studio-export', exportHandler);
    }, 5000);
  };

  const handleAIBoQ = async () => {
    try {
      // Request current state from iframe
      window.dispatchEvent(new CustomEvent('request-iframe-state'));
      
      // Wait for state update
      const boqHandler = async (event: any) => {
        try {
          const currentState = event.detail || state;
          const { data, error } = await supabase.functions.invoke('generate-boq', {
            body: {
              designPurpose: currentState.designPurpose,
              equipment: currentState.equipment,
              cables: currentState.cables,
              containment: currentState.containment,
              zones: currentState.zones,
            },
          });
          if (error) throw error;
          alert(data.boq);
        } catch (error: any) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
          window.removeEventListener('gemini-studio-boq', boqHandler);
        }
      };
      
      window.addEventListener('gemini-studio-boq', boqHandler);
      
      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('gemini-studio-boq', boqHandler);
      }, 5000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full p-2 gap-2">
        {/* Global Actions */}
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving}>
                <Save className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Save to Cloud</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setLoadDialogOpen(true)}>
                <FolderOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Load from Cloud</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <FileDown className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Export PDF</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAIBoQ}>
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
        
        {/* Equipment Selector Button */}
        {state.designPurpose === 'Budget mark up' && (
          <>
            <Separator />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEquipmentSelectorOpen(true)}
                >
                  <Box className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Place Equipment</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      
      <LoadDialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} />
      <EquipmentSelector 
        open={equipmentSelectorOpen} 
        onClose={() => setEquipmentSelectorOpen(false)}
        onSelect={(symbolId) => updateState({ activeTool: `equipment:${symbolId}` })}
      />
    </TooltipProvider>
  );
}
