import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, Lightbulb, Plug, ToggleLeft, Package, Camera, Box } from 'lucide-react';
import { EquipmentType } from '../types';
import { useCreateCircuitMaterial } from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { toast } from 'sonner';

// Define equipment categories with their items
interface EquipmentCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: { type: EquipmentType; defaultUnit: string }[];
}

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: 'lighting',
    label: 'Lighting',
    icon: <Lightbulb className="h-4 w-4" />,
    items: [
      { type: EquipmentType.RECESSED_LIGHT_600, defaultUnit: 'No' },
      { type: EquipmentType.RECESSED_LIGHT_1200, defaultUnit: 'No' },
      { type: EquipmentType.CEILING_LIGHT, defaultUnit: 'No' },
      { type: EquipmentType.CEILING_FLOODLIGHT, defaultUnit: 'No' },
      { type: EquipmentType.FLUORESCENT_2_TUBE, defaultUnit: 'No' },
      { type: EquipmentType.FLUORESCENT_1_TUBE, defaultUnit: 'No' },
      { type: EquipmentType.LED_STRIP_LIGHT, defaultUnit: 'm' },
      { type: EquipmentType.WALL_MOUNTED_LIGHT, defaultUnit: 'No' },
      { type: EquipmentType.POLE_MOUNTED_LIGHT, defaultUnit: 'No' },
      { type: EquipmentType.FLOODLIGHT, defaultUnit: 'No' },
      { type: EquipmentType.POLE_LIGHT, defaultUnit: 'No' },
    ],
  },
  {
    id: 'switches',
    label: 'Switches',
    icon: <ToggleLeft className="h-4 w-4" />,
    items: [
      { type: EquipmentType.GENERAL_LIGHT_SWITCH, defaultUnit: 'No' },
      { type: EquipmentType.DIMMER_SWITCH, defaultUnit: 'No' },
      { type: EquipmentType.TWO_WAY_LIGHT_SWITCH, defaultUnit: 'No' },
      { type: EquipmentType.WATERTIGHT_LIGHT_SWITCH, defaultUnit: 'No' },
      { type: EquipmentType.MOTION_SENSOR, defaultUnit: 'No' },
      { type: EquipmentType.PHOTO_CELL, defaultUnit: 'No' },
    ],
  },
  {
    id: 'sockets',
    label: 'Sockets',
    icon: <Plug className="h-4 w-4" />,
    items: [
      { type: EquipmentType.SOCKET_16A, defaultUnit: 'No' },
      { type: EquipmentType.SOCKET_DOUBLE, defaultUnit: 'No' },
      { type: EquipmentType.CLEAN_POWER_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.EMERGENCY_SOCKET, defaultUnit: 'No' },
      { type: EquipmentType.UPS_SOCKET, defaultUnit: 'No' },
      { type: EquipmentType.SINGLE_PHASE_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.THREE_PHASE_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.SOCKET_16A_TP, defaultUnit: 'No' },
      { type: EquipmentType.GEYSER_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.FLUSH_FLOOR_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.WORKSTATION_OUTLET, defaultUnit: 'No' },
    ],
  },
  {
    id: 'data',
    label: 'Data/Comms',
    icon: <Camera className="h-4 w-4" />,
    items: [
      { type: EquipmentType.DATA_SOCKET, defaultUnit: 'No' },
      { type: EquipmentType.TELEPHONE_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.TV_OUTLET, defaultUnit: 'No' },
      { type: EquipmentType.CCTV_CAMERA, defaultUnit: 'No' },
      { type: EquipmentType.TELEPHONE_BOARD, defaultUnit: 'No' },
    ],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    icon: <Box className="h-4 w-4" />,
    items: [
      { type: EquipmentType.DRAWBOX_50, defaultUnit: 'No' },
      { type: EquipmentType.DRAWBOX_100, defaultUnit: 'No' },
      { type: EquipmentType.BOX_FLUSH_FLOOR, defaultUnit: 'No' },
      { type: EquipmentType.MANHOLE, defaultUnit: 'No' },
      { type: EquipmentType.BREAK_GLASS_UNIT, defaultUnit: 'No' },
      { type: EquipmentType.AC_CONTROLLER_BOX, defaultUnit: 'No' },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    icon: <Package className="h-4 w-4" />,
    items: [
      { type: EquipmentType.DISTRIBUTION_BOARD, defaultUnit: 'No' },
      { type: EquipmentType.MAIN_BOARD, defaultUnit: 'No' },
      { type: EquipmentType.SUB_BOARD, defaultUnit: 'No' },
      { type: EquipmentType.INVERTER, defaultUnit: 'No' },
      { type: EquipmentType.GENERATOR, defaultUnit: 'No' },
    ],
  },
];

interface QuickAddMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuitId: string;
  circuitRef: string;
  projectId?: string;
  floorPlanId?: string;
}

export const QuickAddMaterialsDialog: React.FC<QuickAddMaterialsDialogProps> = ({
  open,
  onOpenChange,
  circuitId,
  circuitRef,
  projectId,
  floorPlanId,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('lighting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createMaterial = useCreateCircuitMaterial();

  // Filter items based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return EQUIPMENT_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    return EQUIPMENT_CATEGORIES.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.type.toLowerCase().includes(query)
      ),
    })).filter(category => category.items.length > 0);
  }, [searchQuery]);

  // Count total items to add
  const totalItems = useMemo(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0);
  }, [quantities]);

  const updateQuantity = (type: EquipmentType, delta: number) => {
    setQuantities(prev => {
      const current = prev[type] || 0;
      const newValue = Math.max(0, current + delta);
      return { ...prev, [type]: newValue };
    });
  };

  const setQuantity = (type: EquipmentType, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [type]: Math.max(0, value),
    }));
  };

  const handleSubmit = async () => {
    const itemsToAdd = Object.entries(quantities).filter(([_, qty]) => qty > 0);
    
    if (itemsToAdd.length === 0) {
      toast.error('No items to add');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [typeKey, qty] of itemsToAdd) {
        // Find the item details
        let itemDetails: { type: EquipmentType; defaultUnit: string } | undefined;
        for (const category of EQUIPMENT_CATEGORIES) {
          const found = category.items.find(item => item.type === typeKey);
          if (found) {
            itemDetails = found;
            break;
          }
        }

        if (!itemDetails) continue;

        try {
          await createMaterial.mutateAsync({
            circuit_id: circuitId,
            description: itemDetails.type, // The enum value is the display name
            unit: itemDetails.defaultUnit,
            quantity: qty,
            project_id: projectId,
            floor_plan_id: floorPlanId,
            skip_supporting_materials: true, // Don't auto-generate accessories for point items
          });
          successCount++;
        } catch (err) {
          console.error('Failed to add material:', err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${successCount} item${successCount > 1 ? 's' : ''} to ${circuitRef}`);
        setQuantities({});
        onOpenChange(false);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to add ${errorCount} item${errorCount > 1 ? 's' : ''}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuantities({});
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Add Materials
            <Badge variant="outline" className="ml-2">
              {circuitRef}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0">
            {filteredCategories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center gap-1.5 text-xs"
              >
                {category.icon}
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {filteredCategories.map((category) => (
              <TabsContent 
                key={category.id} 
                value={category.id} 
                className="m-0 space-y-1"
              >
                {category.items.map((item) => {
                  const qty = quantities[item.type] || 0;
                  return (
                    <div
                      key={item.type}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-grow min-w-0 pr-4">
                        <span className="text-sm font-medium truncate block">
                          {item.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Unit: {item.defaultUnit}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.type, -1)}
                          disabled={qty === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <Input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => setQuantity(item.type, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center"
                        />
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.type, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex items-center justify-between border-t pt-4 mt-4">
          <div className="text-sm text-muted-foreground">
            {totalItems > 0 && (
              <span className="font-medium text-foreground">
                {totalItems} item{totalItems !== 1 ? 's' : ''} to add
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={totalItems === 0 || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : `Add ${totalItems > 0 ? totalItems : ''} Items`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
