import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { equipmentSymbols } from '@/lib/floorPlan/symbols';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EquipmentSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (symbolId: string) => void;
}

export function EquipmentSelector({ open, onClose, onSelect }: EquipmentSelectorProps) {
  const categories = [...new Set(equipmentSymbols.map(s => s.category))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Equipment</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={categories[0]}>
          <TabsList className="w-full">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
          <ScrollArea className="h-96">
            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-4 gap-3">
                  {equipmentSymbols.filter(s => s.category === category).map(symbol => (
                    <Button
                      key={symbol.id}
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => {
                        onSelect(symbol.id);
                        onClose();
                      }}
                    >
                      <div className="text-xs font-medium">{symbol.name}</div>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
