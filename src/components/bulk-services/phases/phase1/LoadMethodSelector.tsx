/**
 * Load Method Selector
 * Allows users to choose their preferred method for identifying connected loads
 */

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  List, 
  LayoutGrid, 
  Calculator, 
  Building2, 
  Home, 
  Link2,
  Zap
} from 'lucide-react';

export type LoadMethod = 'total' | 'itemized' | 'category' | 'sans204' | 'sans10142' | 'admd' | 'external';

interface LoadMethodSelectorProps {
  method: LoadMethod;
  onMethodChange: (method: LoadMethod) => void;
  projectType?: 'commercial' | 'residential' | 'mixed';
}

const LOAD_METHODS = [
  {
    value: 'itemized' as LoadMethod,
    label: 'Itemized Schedule',
    description: 'Add individual loads (HVAC, motors, lighting) with ratings',
    icon: List,
    badge: 'Most Accurate',
    badgeVariant: 'default' as const,
    recommended: ['commercial', 'mixed'],
  },
  {
    value: 'category' as LoadMethod,
    label: 'Category Totals',
    description: 'Enter totals per system (Lighting, HVAC, IT, Motors)',
    icon: LayoutGrid,
    badge: 'Balanced',
    badgeVariant: 'secondary' as const,
    recommended: ['commercial'],
  },
  {
    value: 'sans204' as LoadMethod,
    label: 'SANS 204 (VA/m²)',
    description: 'Building classification with area-based load density',
    icon: Building2,
    badge: 'Commercial',
    badgeVariant: 'outline' as const,
    recommended: ['commercial', 'mixed'],
  },
  {
    value: 'sans10142' as LoadMethod,
    label: 'SANS 10142-1',
    description: 'Socket outlet and lighting loads by building type',
    icon: Zap,
    badge: 'Standard',
    badgeVariant: 'outline' as const,
    recommended: ['commercial'],
  },
  {
    value: 'admd' as LoadMethod,
    label: 'ADMD Residential',
    description: 'After Diversity Maximum Demand for dwelling units',
    icon: Home,
    badge: 'Residential',
    badgeVariant: 'outline' as const,
    recommended: ['residential'],
  },
  {
    value: 'external' as LoadMethod,
    label: 'External Meters',
    description: 'Link to real demand profiles from existing buildings',
    icon: Link2,
    badge: 'Data-Driven',
    badgeVariant: 'secondary' as const,
    recommended: ['commercial', 'mixed'],
  },
  {
    value: 'total' as LoadMethod,
    label: 'Direct Entry',
    description: 'Enter total connected load directly (kVA)',
    icon: Calculator,
    badge: 'Quick',
    badgeVariant: 'outline' as const,
    recommended: [],
  },
];

export function LoadMethodSelector({ method, onMethodChange, projectType = 'commercial' }: LoadMethodSelectorProps) {
  return (
    <RadioGroup 
      value={method} 
      onValueChange={(v) => onMethodChange(v as LoadMethod)}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      {LOAD_METHODS.map((item) => {
        const Icon = item.icon;
        const isRecommended = item.recommended.includes(projectType);
        
        return (
          <Label
            key={item.value}
            htmlFor={item.value}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              method === item.value 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            } ${isRecommended ? 'ring-1 ring-primary/20' : ''}`}
          >
            <RadioGroupItem value={item.value} id={item.value} className="mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant={item.badgeVariant} className="text-xs">
                  {item.badge}
                </Badge>
                {isRecommended && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
