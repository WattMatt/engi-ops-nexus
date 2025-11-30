import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { FileText, Save, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ExtractedSection {
  section_code: string;
  section_name: string;
  display_order: number;
  line_items: ExtractedLineItem[];
}

interface ExtractedLineItem {
  item_number: string;
  description: string;
  area: number | null;
  area_unit: string;
  base_rate: number | null;
  ti_rate: number | null;
  total: number;
  shop_number: string | null;
  is_tenant_item: boolean;
}

interface ExtractedData {
  budget_number: string;
  revision: string;
  budget_date: string;
  prepared_for_company: string | null;
  prepared_for_contact: string | null;
  sections: ExtractedSection[];
  area_schedule: Array<{
    shop_number: string;
    tenant_name: string;
    area: number;
    area_unit: string;
    base_rate: number | null;
    ti_rate: number | null;
    total: number | null;
    category: string;
  }>;
}

interface BudgetExtractionReviewProps {
  budgetId: string;
  extractedData: ExtractedData;
  onSave: () => void;
  onCancel: () => void;
}

export const BudgetExtractionReview = ({ 
  budgetId, 
  extractedData, 
  onSave, 
  onCancel 
}: BudgetExtractionReviewProps) => {
  const [data, setData] = useState<ExtractedData>(extractedData);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update budget metadata
      await supabase
        .from('electrical_budgets')
        .update({
          budget_number: data.budget_number,
          revision: data.revision,
          budget_date: data.budget_date,
          prepared_for_company: data.prepared_for_company,
          prepared_for_contact: data.prepared_for_contact,
          extraction_status: 'reviewed',
        })
        .eq('id', budgetId);

      // Create sections and line items
      for (const section of data.sections) {
        // Create section
        const { data: createdSection, error: sectionError } = await supabase
          .from('budget_sections')
          .insert({
            budget_id: budgetId,
            section_code: section.section_code,
            section_name: section.section_name,
            display_order: section.display_order,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Create line items for this section
        if (section.line_items?.length > 0) {
          const lineItems = section.line_items.map((item, index) => {
            // Calculate total if not provided: area * (base_rate + ti_rate)
            const calculatedTotal = item.total ?? 
              ((item.area || 0) * ((item.base_rate || 0) + (item.ti_rate || 0)));
            
            return {
              section_id: createdSection.id,
              item_number: item.item_number || '',
              description: item.description || 'Unnamed item',
              area: item.area,
              area_unit: item.area_unit || 'm²',
              base_rate: item.base_rate,
              ti_rate: item.ti_rate,
              total: calculatedTotal,
              shop_number: item.shop_number,
              is_tenant_item: item.is_tenant_item,
              display_order: index + 1,
            };
          });

          const { error: itemsError } = await supabase
            .from('budget_line_items')
            .insert(lineItems);

          if (itemsError) throw itemsError;
        }
      }

      // Sync unique retail rates to master_rate_library for analytics
      let ratesSynced = 0;
      if (data.area_schedule?.length > 0) {
        // Get unique tenant names with their rates
        const uniqueRates = new Map<string, { base_rate: number | null; ti_rate: number | null }>();
        
        for (const item of data.area_schedule) {
          const key = item.tenant_name.toUpperCase().trim();
          // Only add if we have rate data and not already added
          if ((item.base_rate || item.ti_rate) && !uniqueRates.has(key)) {
            uniqueRates.set(key, {
              base_rate: item.base_rate,
              ti_rate: item.ti_rate,
            });
          }
        }

        // Insert into master_rate_library
        const { data: { user } } = await supabase.auth.getUser();
        
        for (const [tenantName, rates] of uniqueRates) {
          // Check if this rate already exists
          const { data: existing } = await supabase
            .from('master_rate_library')
            .select('id')
            .eq('item_description', tenantName)
            .eq('item_type', 'retail_tenant')
            .eq('is_current', true)
            .single();

          if (!existing) {
            const { error: rateError } = await supabase
              .from('master_rate_library')
              .insert({
                item_type: 'retail_tenant',
                item_description: tenantName,
                base_rate: rates.base_rate,
                ti_rate: rates.ti_rate,
                unit: 'R/m²',
                is_current: true,
                effective_from: new Date().toISOString().split('T')[0],
                created_by: user?.id,
                notes: `Extracted from budget ${data.budget_number}`,
              });
            
            if (!rateError) ratesSynced++;
          }
        }
      }

      toast({
        title: "Budget Saved",
        description: `Created ${data.sections.length} sections with ${data.sections.reduce((sum, s) => sum + (s.line_items?.length || 0), 0)} line items. ${ratesSynced > 0 ? `Synced ${ratesSynced} rates to library.` : ''}`,
      });

      queryClient.invalidateQueries({ queryKey: ["budget-sections", budgetId] });
      queryClient.invalidateQueries({ queryKey: ["budget-line-items", budgetId] });
      queryClient.invalidateQueries({ queryKey: ["master-rate-library"] });
      onSave();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ExtractedData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setEditingField(null);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const totalBudget = data.sections.reduce((sum, section) => {
    return sum + section.line_items.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Review Extracted Data
        </CardTitle>
        <CardDescription>
          Review and edit the extracted budget data before saving
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections ({data.sections.length})</TabsTrigger>
            <TabsTrigger value="area-schedule">Area Schedule ({data.area_schedule.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Budget Number</label>
                {editingField === 'budget_number' ? (
                  <div className="flex gap-2">
                    <Input
                      value={data.budget_number}
                      onChange={(e) => setData(prev => ({ ...prev, budget_number: e.target.value }))}
                    />
                    <Button size="icon" variant="ghost" onClick={() => setEditingField(null)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{data.budget_number || '—'}</span>
                    <Button size="icon" variant="ghost" onClick={() => setEditingField('budget_number')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Revision</label>
                {editingField === 'revision' ? (
                  <div className="flex gap-2">
                    <Input
                      value={data.revision}
                      onChange={(e) => setData(prev => ({ ...prev, revision: e.target.value }))}
                    />
                    <Button size="icon" variant="ghost" onClick={() => setEditingField(null)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{data.revision || '—'}</span>
                    <Button size="icon" variant="ghost" onClick={() => setEditingField('revision')}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prepared For</label>
                <span className="font-medium block">{data.prepared_for_company || '—'}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contact</label>
                <span className="font-medium block">{data.prepared_for_contact || '—'}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Budget</span>
                <span className="text-2xl font-bold">{formatCurrency(totalBudget)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sections">
            <Accordion type="multiple" className="w-full">
              {data.sections.map((section, sectionIndex) => {
                const sectionTotal = section.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
                return (
                  <AccordionItem key={sectionIndex} value={`section-${sectionIndex}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 w-full pr-4">
                        <Badge variant="outline">{section.section_code}</Badge>
                        <span className="flex-1 text-left">{section.section_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {section.line_items.length} items
                        </span>
                        <span className="font-medium">{formatCurrency(sectionTotal)}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Item #</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Area</TableHead>
                            <TableHead className="text-right">Base Rate</TableHead>
                            <TableHead className="text-right">TI Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.line_items.map((item, itemIndex) => (
                            <TableRow key={itemIndex}>
                              <TableCell className="font-mono text-sm">
                                {item.item_number}
                              </TableCell>
                              <TableCell>
                                {item.description}
                                {item.is_tenant_item && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Tenant
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.area ? `${item.area} ${item.area_unit}` : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(item.base_rate)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(item.ti_rate)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          <TabsContent value="area-schedule">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="text-right">TI Rate</TableHead>
                  <TableHead className="text-right">Total Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.area_schedule.map((item, index) => {
                  const combinedRate = (item.base_rate || 0) + (item.ti_rate || 0);
                  return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.shop_number}</TableCell>
                    <TableCell>{item.tenant_name}</TableCell>
                    <TableCell className="text-right">
                      {item.area} {item.area_unit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.base_rate ? formatCurrency(item.base_rate) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.ti_rate ? formatCurrency(item.ti_rate) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(combinedRate)}/m²
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.total ? formatCurrency(item.total) : formatCurrency(item.area * combinedRate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save to Budget'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
