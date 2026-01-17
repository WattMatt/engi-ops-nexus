import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  shop_number: string;
  tenant_name: string | null;
  area: number | null;
  category: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  projectId: string;
  boqId?: string;
}

interface TemplateItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  supply_rate: number;
  install_rate: number;
  category: string;
}

interface Template {
  id: string;
  area_label: string;
  min_area: number;
  max_area: number;
  db_size: string | null;
  items: TemplateItem[];
}

export function GenerateLineShopBOQDialog({
  open,
  onOpenChange,
  tenant,
  projectId,
  boqId,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Find matching template based on tenant area
  const { data: matchingTemplate, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["matching-line-shop-template", tenant.area],
    queryFn: async () => {
      if (!tenant.area) return null;

      // Find template where area falls within range
      const { data: templates, error } = await supabase
        .from("line_shop_material_templates")
        .select("*")
        .lte("min_area", tenant.area)
        .gte("max_area", tenant.area)
        .order("min_area", { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!templates || templates.length === 0) return null;

      const template = templates[0];

      // Fetch items for this template
      const { data: items, error: itemsError } = await supabase
        .from("line_shop_template_items")
        .select("*")
        .eq("template_id", template.id)
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...template,
        items: items || [],
      } as Template;
    },
    enabled: open && !!tenant.area,
  });

  // Set selected template when data loads
  useState(() => {
    if (matchingTemplate) {
      setSelectedTemplate(matchingTemplate);
    }
  });

  // Get Section E (Line Shops) for the BOQ
  const { data: lineShopSection } = useQuery({
    queryKey: ["line-shop-section", boqId],
    queryFn: async () => {
      if (!boqId) return null;

      // Find Bill with "Line Shops" or section code starting with "E"
      const { data: bills, error: billsError } = await supabase
        .from("boq_bills")
        .select("id, bill_number, bill_name")
        .eq("project_boq_id", boqId);

      if (billsError) throw billsError;

      // Look for a Line Shops bill or create reference
      const lineShopBill = bills?.find(
        (b) =>
          b.bill_name.toLowerCase().includes("line shop") ||
          b.bill_name.toLowerCase().includes("shops") ||
          b.bill_number === 5 // Often Bill E / 5
      );

      if (!lineShopBill) return null;

      // Find or note the section
      const { data: sections, error: sectionsError } = await supabase
        .from("boq_project_sections")
        .select("id, section_code, section_name")
        .eq("bill_id", lineShopBill.id);

      if (sectionsError) throw sectionsError;

      return {
        billId: lineShopBill.id,
        billName: lineShopBill.bill_name,
        sections: sections || [],
      };
    },
    enabled: open && !!boqId,
  });

  // Generate BOQ items mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!matchingTemplate || !boqId) {
        throw new Error("Missing template or BOQ");
      }

      // For now, we'll create items directly
      // In a full implementation, this would create proper section items
      const itemsToCreate = matchingTemplate.items.map((item, idx) => ({
        section_id: lineShopSection?.sections[0]?.id, // Use first section or create new
        item_code: `${tenant.shop_number}-${item.item_code || idx + 1}`,
        description: `${tenant.shop_number}: ${item.description}`,
        unit: item.unit,
        quantity: item.quantity,
        supply_rate: item.supply_rate,
        install_rate: item.install_rate,
        total_rate: item.supply_rate + item.install_rate,
        supply_cost: item.quantity * item.supply_rate,
        install_cost: item.quantity * item.install_rate,
        total_amount: item.quantity * (item.supply_rate + item.install_rate),
        display_order: idx,
        notes: `Generated from Line Shop template for ${tenant.shop_number} (${tenant.area}m²)`,
      }));

      if (lineShopSection?.sections[0]?.id) {
        const { error } = await supabase.from("boq_items").insert(itemsToCreate);
        if (error) throw error;
      } else {
        // If no section exists, just return success with info
        toast.info("Template matched but no Line Shop section found in BOQ. Items not created.");
        return { itemsCount: itemsToCreate.length, created: false };
      }

      return { itemsCount: itemsToCreate.length, created: true };
    },
    onSuccess: (result) => {
      if (result?.created) {
        toast.success(`Generated ${result.itemsCount} BOQ items for ${tenant.shop_number}`);
        queryClient.invalidateQueries({ queryKey: ["boq-items"] });
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to generate BOQ: " + error.message);
    },
  });

  const template = matchingTemplate;
  const totalSupply = template?.items.reduce((sum, i) => sum + i.quantity * i.supply_rate, 0) || 0;
  const totalInstall = template?.items.reduce((sum, i) => sum + i.quantity * i.install_rate, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Generate Line Shop BOQ
          </DialogTitle>
          <DialogDescription>
            Auto-generate BOQ items for {tenant.shop_number} based on area template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tenant Info */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">{tenant.shop_number}</p>
              <p className="text-sm text-muted-foreground">{tenant.tenant_name || "No tenant"}</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              {tenant.area ? `${tenant.area}m²` : "No area"}
            </Badge>
            {tenant.category && <Badge>{tenant.category}</Badge>}
          </div>

          {/* No area warning */}
          {!tenant.area && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This tenant has no area defined. Please update the tenant's area in the schedule first.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading */}
          {isLoadingTemplate && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {/* No matching template */}
          {!isLoadingTemplate && tenant.area && !template && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No template found for area range {tenant.area}m². Please create a template in 
                Master Library → Line Shop Templates.
              </AlertDescription>
            </Alert>
          )}

          {/* Template Preview */}
          {template && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Matched template: <strong>{template.area_label}</strong></span>
                {template.db_size && (
                  <Badge variant="secondary">{template.db_size}</Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Supply</TableHead>
                      <TableHead className="text-right">Install</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {template.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          R{(item.quantity * item.supply_rate).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          R{(item.quantity * item.install_rate).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R{(item.quantity * (item.supply_rate + item.install_rate)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-8 p-4 bg-muted rounded-lg">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Supply</p>
                  <p className="font-medium">R{totalSupply.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Install</p>
                  <p className="font-medium">R{totalInstall.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">R{(totalSupply + totalInstall).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!template || generateMutation.isPending}
          >
            <Package className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Generate BOQ Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
