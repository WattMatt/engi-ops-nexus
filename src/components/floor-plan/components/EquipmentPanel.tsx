import React from 'react';
import { Tool } from '@/types/floor-plan';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface EquipmentPanelProps {
  onEquipmentSelect: (type: string) => void;
  activeTool: Tool;
  purposeConfig: PurposeConfig | null;
}

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ 
  onEquipmentSelect, 
  activeTool, 
  purposeConfig 
}) => {
  if (!purposeConfig || activeTool !== Tool.PLACE_EQUIPMENT) {
    return null;
  }

  return (
    <div className="w-64 bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Equipment Library</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select equipment to place
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {purposeConfig.availableEquipment.map((item) => (
              <Button
                key={item}
                variant="outline"
                size="sm"
                className="h-auto flex-col py-3 px-2"
                onClick={() => onEquipmentSelect(item)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <span className="text-xs font-bold text-primary">
                    {item.substring(0, 2)}
                  </span>
                </div>
                <span className="text-xs text-center line-clamp-2">
                  {item.replace(/_/g, ' ')}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default EquipmentPanel;
