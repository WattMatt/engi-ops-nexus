import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { DesignPurpose } from '@/lib/floorPlan/types';
import { FileText, Ruler, Sun } from 'lucide-react';

const purposes: { id: DesignPurpose; title: string; description: string; icon: any }[] = [
  {
    id: 'Budget mark up',
    title: 'Budget Mark Up',
    description: 'Quantity takeoff for cost estimation with comprehensive equipment library and automated calculations',
    icon: FileText,
  },
  {
    id: 'Line shop measurements',
    title: 'Line Shop Measurements',
    description: 'Precise measurements for fabrication including containment routes and zone areas',
    icon: Ruler,
  },
  {
    id: 'PV design',
    title: 'PV Design',
    description: 'Solar panel layout with roof analysis, pitch calculations, and array placement',
    icon: Sun,
  },
];

export function DesignPurposeSelector() {
  const { updateState } = useFloorPlan();

  const handleSelect = (purpose: DesignPurpose) => {
    updateState({ designPurpose: purpose });
  };

  return (
    <div className="max-w-4xl w-full p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Select Design Purpose</h2>
        <p className="text-muted-foreground">
          Choose your workflow to configure the available tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {purposes.map((purpose) => {
          const Icon = purpose.icon;
          return (
            <Card
              key={purpose.id}
              className="p-6 hover:border-primary transition-colors cursor-pointer"
              onClick={() => handleSelect(purpose.id)}
            >
              <Icon className="h-12 w-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">{purpose.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {purpose.description}
              </p>
              <Button variant="outline" className="w-full">
                Select
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
