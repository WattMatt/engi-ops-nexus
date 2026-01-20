/**
 * Electrical Standards Card
 * Allows selection of applicable electrical standards
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle2 } from 'lucide-react';

interface ElectricalStandardsCardProps {
  standard: string;
  onStandardChange: (standard: string) => void;
}

const STANDARDS = [
  { 
    value: 'SANS 10142-1', 
    label: 'SANS 10142-1', 
    description: 'The Wiring of Premises - South African National Standard',
    region: 'South Africa',
    isDefault: true 
  },
  { 
    value: 'SANS 10142-2', 
    label: 'SANS 10142-2', 
    description: 'Low-voltage systems and equipment',
    region: 'South Africa',
    isDefault: false 
  },
  { 
    value: 'BS 7671', 
    label: 'BS 7671 (IET Wiring Regulations)', 
    description: 'Requirements for Electrical Installations',
    region: 'UK/Europe',
    isDefault: false 
  },
  { 
    value: 'IEC 60364', 
    label: 'IEC 60364', 
    description: 'Low-voltage electrical installations',
    region: 'International',
    isDefault: false 
  },
  { 
    value: 'NEC', 
    label: 'NFPA 70 (NEC)', 
    description: 'National Electrical Code',
    region: 'USA',
    isDefault: false 
  },
];

export function ElectricalStandardsCard({ standard, onStandardChange }: ElectricalStandardsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Electrical Standards
        </CardTitle>
        <CardDescription>
          Select the applicable electrical wiring and installation standard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={standard} onValueChange={onStandardChange} className="space-y-3">
          {STANDARDS.map((std) => (
            <Label
              key={std.value}
              htmlFor={std.value}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                standard === std.value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value={std.value} id={std.value} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{std.label}</span>
                  <Badge variant="outline" className="text-xs">{std.region}</Badge>
                  {std.isDefault && (
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {std.description}
                </p>
              </div>
              {standard === std.value && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
