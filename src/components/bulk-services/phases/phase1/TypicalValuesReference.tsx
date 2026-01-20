/**
 * Typical Values Reference Panel
 * Displays industry-standard typical values for electrical load estimation
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Lightbulb, Wind, Cpu, Cog, Building2, Factory, Home, ShoppingBag } from 'lucide-react';

const TYPICAL_VALUES = {
  loadDensities: [
    { category: 'Offices (General)', vaPerSqm: '75-90', icon: Building2 },
    { category: 'Retail (Shopping Centre)', vaPerSqm: '85-100', icon: ShoppingBag },
    { category: 'Industrial (Light)', vaPerSqm: '50-80', icon: Factory },
    { category: 'Residential (Apartments)', vaPerSqm: '25-40', icon: Home },
    { category: 'Data Centres', vaPerSqm: '500-2000', icon: Cpu },
    { category: 'Hotels', vaPerSqm: '80-95', icon: Building2 },
    { category: 'Hospitals', vaPerSqm: '150-200', icon: Building2 },
    { category: 'Schools', vaPerSqm: '60-80', icon: Building2 },
  ],
  powerFactors: [
    { load: 'LED Lighting', pf: '0.90 - 0.98', typical: 0.95 },
    { load: 'Fluorescent Lighting', pf: '0.85 - 0.95', typical: 0.9 },
    { load: 'HVAC (with VSD)', pf: '0.85 - 0.95', typical: 0.9 },
    { load: 'HVAC (DOL)', pf: '0.75 - 0.85', typical: 0.8 },
    { load: 'Motors (large)', pf: '0.80 - 0.90', typical: 0.85 },
    { load: 'Motors (small)', pf: '0.60 - 0.80', typical: 0.7 },
    { load: 'Computers/IT', pf: '0.85 - 0.95', typical: 0.9 },
    { load: 'General GPO', pf: '0.80 - 0.90', typical: 0.85 },
  ],
  demandFactors: [
    { application: 'Office Buildings', df: '0.65 - 0.80', typical: 0.75 },
    { application: 'Shopping Centres', df: '0.70 - 0.85', typical: 0.8 },
    { application: 'Industrial', df: '0.50 - 0.70', typical: 0.6 },
    { application: 'Hotels', df: '0.50 - 0.65', typical: 0.55 },
    { application: 'Hospitals', df: '0.60 - 0.75', typical: 0.7 },
    { application: 'Schools', df: '0.55 - 0.70', typical: 0.6 },
    { application: 'Data Centres', df: '0.85 - 0.95', typical: 0.9 },
    { application: 'Residential', df: '0.40 - 0.60', typical: 0.5 },
  ],
  diversityFactors: [
    { scenario: '2-4 similar loads', factor: '0.80 - 0.90' },
    { scenario: '5-10 similar loads', factor: '0.70 - 0.80' },
    { scenario: '10-20 similar loads', factor: '0.60 - 0.70' },
    { scenario: '20+ similar loads', factor: '0.50 - 0.65' },
    { scenario: 'Mixed use building', factor: '0.65 - 0.75' },
    { scenario: 'Industrial with varied processes', factor: '0.50 - 0.60' },
  ],
  expansionAllowances: [
    { horizon: '5 years', allowance: '10-15%' },
    { horizon: '10 years', allowance: '15-25%' },
    { horizon: '20 years', allowance: '25-40%' },
    { horizon: 'Data centres', allowance: '50-100%' },
  ],
};

export function TypicalValuesReference() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Reference Values
        </CardTitle>
        <CardDescription>
          Industry-standard typical values for electrical load estimation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {/* Load Densities */}
          <AccordionItem value="densities">
            <AccordionTrigger className="text-sm font-medium">
              Load Densities (VA/m²)
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {TYPICAL_VALUES.loadDensities.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.category}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.category}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {item.vaPerSqm}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Power Factors */}
          <AccordionItem value="pf">
            <AccordionTrigger className="text-sm font-medium">
              Power Factors by Load Type
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {TYPICAL_VALUES.powerFactors.map((item) => (
                  <div 
                    key={item.load}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{item.load}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.pf}
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {item.typical}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Demand Factors */}
          <AccordionItem value="df">
            <AccordionTrigger className="text-sm font-medium">
              Demand Factors by Application
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                {TYPICAL_VALUES.demandFactors.map((item) => (
                  <div 
                    key={item.application}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{item.application}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.df}
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {item.typical}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Diversity Factors */}
          <AccordionItem value="diversity">
            <AccordionTrigger className="text-sm font-medium">
              Diversity Factors
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {TYPICAL_VALUES.diversityFactors.map((item) => (
                  <div 
                    key={item.scenario}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{item.scenario}</span>
                    <Badge variant="secondary" className="font-mono">
                      {item.factor}
                    </Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Future Expansion */}
          <AccordionItem value="expansion">
            <AccordionTrigger className="text-sm font-medium">
              Future Expansion Allowances
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {TYPICAL_VALUES.expansionAllowances.map((item) => (
                  <div 
                    key={item.horizon}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{item.horizon}</span>
                    <Badge variant="secondary" className="font-mono">
                      {item.allowance}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Always consider site-specific factors and client requirements when 
                determining expansion allowances.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
