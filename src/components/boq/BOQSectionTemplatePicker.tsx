import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FolderOpen, FileText, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface BOQSectionTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: SectionTemplate) => void;
  onInsertWithItems: (template: SectionTemplate, items: ItemTemplate[]) => void;
}

interface SectionTemplate {
  id: string;
  section_code: string;
  section_name: string;
  description: string | null;
  category: string | null;
  display_order: number;
}

interface ItemTemplate {
  id: string;
  section_template_id: string;
  item_code: string;
  description: string;
  item_type: string;
  unit: string | null;
  default_quantity: number | null;
  default_supply_rate: number | null;
  default_install_rate: number | null;
  default_percentage: number | null;
  reference_item_code: string | null;
  display_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  preliminary: "Preliminary & General",
  medium_voltage: "Medium Voltage",
  lv_systems: "LV Systems",
  lighting: "Lighting",
  small_power: "Small Power",
  earthing: "Earthing & Lightning Protection",
  fire: "Fire Detection",
  security: "Security Systems",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  preliminary: <FileText className="h-4 w-4" />,
  medium_voltage: <Package className="h-4 w-4" />,
  lv_systems: <Package className="h-4 w-4" />,
  lighting: <Package className="h-4 w-4" />,
  small_power: <Package className="h-4 w-4" />,
  earthing: <Package className="h-4 w-4" />,
  fire: <Package className="h-4 w-4" />,
  security: <Package className="h-4 w-4" />,
};

export function BOQSectionTemplatePicker({
  open,
  onOpenChange,
  onSelectTemplate,
  onInsertWithItems,
}: BOQSectionTemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<SectionTemplate | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["boq-section-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_section_templates")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as SectionTemplate[];
    },
    enabled: open,
  });

  const { data: itemTemplates = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["boq-item-templates", selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate) return [];
      const { data, error } = await supabase
        .from("boq_item_templates")
        .select("*")
        .eq("section_template_id", selectedTemplate.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as ItemTemplate[];
    },
    enabled: !!selectedTemplate,
  });

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, SectionTemplate[]>);

  // Filter templates by search
  const filteredGroups = Object.entries(groupedTemplates).reduce((acc, [category, items]) => {
    const filtered = items.filter(
      (t) =>
        t.section_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.section_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, SectionTemplate[]>);

  const handleSelectTemplate = (template: SectionTemplate) => {
    setSelectedTemplate(template);
    setSelectedItems(new Set());
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === itemTemplates.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(itemTemplates.map((i) => i.id)));
    }
  };

  const handleInsert = () => {
    if (!selectedTemplate) return;
    
    const selectedItemTemplates = itemTemplates.filter((i) => selectedItems.has(i.id));
    onInsertWithItems(selectedTemplate, selectedItemTemplates);
    onOpenChange(false);
    setSelectedTemplate(null);
    setSelectedItems(new Set());
    setSearchQuery("");
  };

  const handleInsertSectionOnly = () => {
    if (!selectedTemplate) return;
    onSelectTemplate(selectedTemplate);
    onOpenChange(false);
    setSelectedTemplate(null);
    setSelectedItems(new Set());
    setSearchQuery("");
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case "prime_cost":
        return "PC";
      case "percentage":
        return "%";
      case "sub_header":
        return "HDR";
      default:
        return "QTY";
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case "prime_cost":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "percentage":
        return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "sub_header":
        return "bg-purple-500/10 text-purple-600 border-purple-200";
      default:
        return "bg-green-500/10 text-green-600 border-green-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            BOQ Section Templates
          </DialogTitle>
          <DialogDescription>
            Select a section template to quickly add standard BOQ sections with predefined items.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: Template List */}
          <div className="w-1/2 flex flex-col border rounded-lg">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {templatesLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Loading templates...
                </div>
              ) : Object.keys(filteredGroups).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No templates found
                </div>
              ) : (
                <div className="p-2 space-y-4">
                  {Object.entries(filteredGroups).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {CATEGORY_ICONS[category] || <FolderOpen className="h-3 w-3" />}
                        {CATEGORY_LABELS[category] || category}
                      </div>
                      <div className="space-y-1">
                        {items.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                              "w-full text-left p-3 rounded-md transition-colors",
                              "hover:bg-muted/50",
                              selectedTemplate?.id === template.id
                                ? "bg-primary/10 border border-primary/30"
                                : "border border-transparent"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {template.section_code}. {template.section_name}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Preview & Item Selection */}
          <div className="w-1/2 flex flex-col border rounded-lg">
            {!selectedTemplate ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a template to preview items
              </div>
            ) : (
              <>
                <div className="p-3 border-b bg-muted/30">
                  <h3 className="font-semibold">
                    {selectedTemplate.section_code}. {selectedTemplate.section_name}
                  </h3>
                  {selectedTemplate.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={itemTemplates.length > 0 && selectedItems.size === itemTemplates.length}
                      onCheckedChange={handleSelectAll}
                      id="select-all"
                    />
                    <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                      Select all ({itemTemplates.length} items)
                    </label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedItems.size} selected
                  </Badge>
                </div>

                <ScrollArea className="flex-1">
                  {itemsLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Loading items...
                    </div>
                  ) : itemTemplates.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No items in this template
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {itemTemplates.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded-md transition-colors",
                            selectedItems.has(item.id) ? "bg-primary/5" : "hover:bg-muted/30",
                            item.item_type === "sub_header" && "bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs font-mono px-1.5 py-0.5 rounded border",
                                  getItemTypeColor(item.item_type)
                                )}
                              >
                                {getItemTypeLabel(item.item_type)}
                              </span>
                              <span className="text-sm font-medium">{item.item_code}</span>
                              {item.unit && (
                                <span className="text-xs text-muted-foreground">
                                  ({item.unit})
                                </span>
                              )}
                            </div>
                            <p
                              className={cn(
                                "text-xs mt-0.5",
                                item.item_type === "sub_header"
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {item.description}
                            </p>
                            {item.item_type === "percentage" && item.reference_item_code && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                → {item.default_percentage}% of {item.reference_item_code}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-3 border-t bg-muted/30 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleInsertSectionOnly}
                  >
                    Insert Section Only
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleInsert}
                    disabled={selectedItems.size === 0}
                  >
                    Insert with {selectedItems.size} Items
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
