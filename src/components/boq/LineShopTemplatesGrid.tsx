import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Save, Plus, Trash2, Download, Upload } from "lucide-react";

// Define the material items structure
const DEFAULT_MATERIALS = [
  { key: "conduit_25mm", label: "25MM PVC CONDUIT", unit: "m", category: "Conduits" },
  { key: "roundbox_50mm", label: "50mm Ø ROUNDBOX", unit: "No", category: "Boxes" },
  { key: "surface_100x50x50", label: "100x50x50 SURFACE", unit: "No", category: "Boxes" },
  { key: "surface_100x100", label: "100 x 100 SURFACE", unit: "No", category: "Boxes" },
  { key: "roundbox_breakglass", label: "50mm Ø ROUNDBOX RECESSED FOR BREAKGLASS UNIT", unit: "No", category: "Boxes" },
  { key: "drawbox_ac", label: "100 x 100 DRAWBOX RECESSED FOR AC CONTROLLER", unit: "No", category: "Boxes" },
  { key: "drawbox_sso", label: "100 x 100 DRAWBOX RECESSED FOR SSO", unit: "No", category: "Boxes" },
  { key: "sso_recessed", label: "RECESSED S.S.O", unit: "No", category: "Outlets" },
  { key: "tel_outlet", label: "TEL OUTLET", unit: "No", category: "Outlets" },
  { key: "trunking_bend_h", label: "TRUNKING BEND HORIZONTAL P8000 (76x76)", unit: "No", category: "Trunking" },
  { key: "trunking_bend_v", label: "TRUNKING BEND VERTICAL TO HORIZONTAL P8000 (76x76)", unit: "No", category: "Trunking" },
  { key: "trunking_p8000", label: "TRUNKING P8000 (76x76)", unit: "m", category: "Trunking" },
  { key: "trunking_tpiece", label: "TRUNKING T-PIECE HORIZONTAL P8000 (76x76)", unit: "No", category: "Trunking" },
  { key: "te_2_5mm", label: "2,5mm T&E", unit: "m", category: "Conductors" },
  { key: "te_2_5mm_term", label: "2,5mm T&E TERM", unit: "No", category: "Conductors" },
  { key: "ce_2_5mm_4c", label: "2,5mm 4C&E", unit: "m", category: "Conductors" },
  { key: "gp_4mm", label: "4mm GP wire", unit: "m", category: "Conductors" },
  { key: "gp_2_5mm", label: "GP 2,5mm", unit: "m", category: "Conductors" },
  { key: "earth_4mm", label: "Ins Earth 4mm", unit: "m", category: "Conductors" },
  { key: "term_2_5mm", label: "TERM 2.5mm GP wire", unit: "No", category: "Conductors" },
  { key: "gp_1_5mm", label: "GP 1,5mm", unit: "m", category: "Conductors" },
  { key: "earth_2_5mm", label: "Ins Earth 2,5mm", unit: "m", category: "Conductors" },
  { key: "term_gp_1_5mm", label: "GP TERM 1.5 mm", unit: "No", category: "Conductors" },
  { key: "term_gp_2_5mm", label: "GP TERM 2.5 mm", unit: "No", category: "Conductors" },
  { key: "ce_4c_2_5mm", label: "4C & E 2.5 mm", unit: "m", category: "Conductors" },
  { key: "ce_4c_term", label: "4C & E TERM", unit: "No", category: "Conductors" },
  { key: "key_switch", label: "KEY SWITCH", unit: "No", category: "Appliances" },
  { key: "round_so_5a", label: "5A ROUND S.O.", unit: "No", category: "Appliances" },
  { key: "isolator_20a_sp_signage", label: "20A SP ISOLATOR FOR SIGNAGE", unit: "No", category: "Appliances" },
  { key: "sso_flush_16a", label: "RECESSED FLUSH MOUNTED S.S.O 16A NORMAL", unit: "No", category: "Appliances" },
  { key: "isolator_20a_sp_fan", label: "20A SP ISOLATOR FOR FAN", unit: "No", category: "Appliances" },
  { key: "isolator_20a_tp_fan", label: "20A TP ISOLATOR FOR FAN", unit: "No", category: "Appliances" },
  { key: "isolator_20a_sp_wp_ac", label: "20A SP WP ISOLATOR FOR AC", unit: "No", category: "Appliances" },
  { key: "isolator_20a_tp_wp_ac", label: "20A TP WP ISOLATOR FOR AC", unit: "No", category: "Appliances" },
  { key: "downlight_a1", label: "Type A1 DownLight", unit: "No", category: "Lighting" },
  { key: "light_1200x600", label: "Type A 1200x600 Light", unit: "No", category: "Lighting" },
];

// Default area ranges with DB sizes
const DEFAULT_AREA_RANGES = [
  { min: 0, max: 40, label: "0m²-40m²", db_size: "DB 40A TP" },
  { min: 41, max: 80, label: "41m²-80m²", db_size: "DB 60A TP" },
  { min: 81, max: 120, label: "81m²-120m²", db_size: "DB 80A TP" },
  { min: 121, max: 160, label: "121m²-160m²", db_size: "DB 100A TP" },
  { min: 161, max: 200, label: "161m²-200m²", db_size: "DB 100A TP" },
  { min: 201, max: 240, label: "201m²-240m²", db_size: "DB 100A TP" },
  { min: 241, max: 280, label: "241m²-280m²", db_size: "DB 120A TP" },
  { min: 281, max: 320, label: "281m²-320m²", db_size: "DB 120A TP" },
  { min: 321, max: 360, label: "321m²-360m²", db_size: "DB 120A TP" },
  { min: 361, max: 400, label: "361m²-400m²", db_size: "DB 120A TP" },
  { min: 401, max: 440, label: "401m²-440m²", db_size: "DB 150A TP" },
  { min: 441, max: 480, label: "441m²-480m²", db_size: "DB 150A TP" },
  { min: 481, max: 520, label: "481m²-520m²", db_size: "DB 150A TP" },
  { min: 521, max: 560, label: "521m²-560m²", db_size: "DB 150A TP" },
  { min: 561, max: 600, label: "561m²-600m²", db_size: "DB 150A TP" },
  { min: 601, max: 640, label: "601m²-640m²", db_size: "DB 150A TP" },
  { min: 641, max: 680, label: "641m²-680m²", db_size: "DB 200A TP" },
  { min: 681, max: 720, label: "681m²-720m²", db_size: "DB 200A TP" },
  { min: 721, max: 760, label: "721m²-760m²", db_size: "DB 200A TP" },
  { min: 761, max: 800, label: "761m²-800m²", db_size: "DB 200A TP" },
  { min: 801, max: 840, label: "801m²-840m²", db_size: "DB 200A TP" },
  { min: 841, max: 880, label: "841m²-880m²", db_size: "DB 200A TP" },
  { min: 881, max: 920, label: "881m²-920m²", db_size: "DB 200A TP" },
  { min: 921, max: 960, label: "921m²-960m²", db_size: "DB 200A TP" },
  { min: 961, max: 1000, label: "961m²-1000m²", db_size: "DB 200A TP" },
];

// Pre-populated default values from the spreadsheet
// Order: conduit_25mm, roundbox_50mm, surface_100x50x50, surface_100x100, roundbox_breakglass, drawbox_ac, drawbox_sso, sso_recessed, tel_outlet, trunking_bend_h, trunking_bend_v, trunking_p8000, trunking_tpiece, te_2_5mm, te_2_5mm_term, ce_2_5mm_4c, gp_4mm, gp_2_5mm, earth_4mm, term_2_5mm, gp_1_5mm, earth_2_5mm, term_gp_1_5mm, term_gp_2_5mm, ce_4c_2_5mm, ce_4c_term, key_switch, round_so_5a, isolator_20a_sp_signage, sso_flush_16a, isolator_20a_sp_fan, isolator_20a_tp_fan, isolator_20a_sp_wp_ac, isolator_20a_tp_wp_ac, downlight_a1, light_1200x600
const DEFAULT_VALUES: Record<string, number[]> = {
  "0m²-40m²": [52, 8, 1, 1, 1, 1, 2, 1, 0, 1, 12, 0, 61, 8, 0, 55, 28, 2, 24, 12, 6, 4, 0, 0, 1, 8, 1, 2, 1, 0, 1, 0, 4, 4],
  "41m²-80m²": [60, 12, 1, 1, 1, 1, 2, 1, 1, 0, 12, 0, 83, 10, 0, 64, 32, 2, 28, 14, 8, 6, 0, 0, 1, 12, 1, 2, 1, 0, 1, 0, 6, 6],
  "81m²-120m²": [72, 19, 1, 1, 1, 1, 2, 1, 2, 1, 30, 1, 98, 11, 0, 74, 37, 2, 89, 45, 14, 12, 0, 0, 1, 19, 1, 2, 1, 0, 1, 0, 7, 12],
  "121m²-160m²": [88, 23, 1, 1, 1, 1, 3, 1, 2, 1, 36, 1, 122, 10, 19, 93, 47, 3, 88, 88, 19, 16, 19, 1, 1, 23, 1, 3, 1, 0, 0, 1, 7, 16],
  "161m²-200m²": [100, 27, 1, 1, 1, 1, 4, 1, 2, 1, 42, 1, 129, 10, 19, 121, 61, 4, 96, 48, 24, 20, 19, 1, 1, 27, 1, 4, 1, 0, 0, 1, 7, 20],
  "201m²-240m²": [116, 33, 1, 1, 1, 1, 5, 1, 2, 1, 45, 1, 127, 11, 22, 127, 64, 5, 248, 124, 30, 25, 22, 1, 1, 33, 1, 5, 1, 0, 0, 1, 8, 25],
  "241m²-280m²": [128, 38, 1, 1, 1, 1, 6, 1, 2, 1, 51, 1, 136, 11, 25, 133, 67, 6, 275, 138, 36, 30, 25, 1, 1, 38, 1, 6, 1, 0, 0, 1, 8, 30],
  "281m²-320m²": [132, 45, 1, 1, 1, 1, 6, 1, 2, 1, 54, 1, 140, 12, 26, 138, 69, 6, 334, 167, 42, 36, 26, 1, 1, 45, 1, 6, 1, 0, 0, 1, 9, 36],
  "321m²-360m²": [140, 52, 1, 1, 1, 1, 7, 1, 2, 1, 81, 2, 146, 13, 19, 98, 49, 7, 537, 269, 49, 42, 19, 1, 1, 52, 1, 7, 1, 0, 0, 1, 10, 42],
  "361m²-400m²": [152, 59, 1, 1, 1, 1, 8, 1, 2, 1, 90, 2, 152, 13, 53, 162, 81, 8, 661, 331, 57, 49, 53, 2, 1, 59, 1, 8, 1, 0, 0, 2, 10, 49],
  "401m²-440m²": [164, 60, 1, 1, 1, 1, 9, 1, 2, 1, 93, 2, 155, 14, 53, 199, 100, 9, 692, 346, 58, 49, 53, 2, 1, 60, 1, 9, 1, 0, 0, 2, 11, 49],
  "441m²-480m²": [172, 68, 1, 1, 1, 1, 10, 1, 2, 1, 93, 2, 169, 15, 60, 212, 106, 10, 533, 267, 66, 56, 60, 2, 1, 68, 1, 10, 1, 0, 0, 2, 12, 56],
  "481m²-520m²": [180, 76, 1, 1, 1, 1, 10, 1, 2, 1, 99, 2, 172, 14, 59, 216, 108, 10, 408, 204, 74, 64, 59, 3, 1, 76, 1, 10, 0, 1, 0, 2, 12, 64],
  "521m²-560m²": [192, 76, 1, 1, 1, 1, 11, 1, 2, 1, 99, 2, 178, 14, 63, 231, 116, 11, 825, 413, 75, 64, 63, 3, 1, 76, 1, 11, 0, 1, 0, 2, 12, 64],
  "561m²-600m²": [200, 77, 1, 1, 1, 1, 12, 1, 2, 1, 102, 2, 168, 15, 61, 251, 126, 12, 880, 440, 76, 64, 61, 3, 1, 77, 1, 12, 0, 1, 0, 2, 13, 64],
  "601m²-640m²": [216, 85, 1, 1, 1, 1, 13, 1, 2, 1, 105, 2, 163, 15, 144, 268, 134, 13, 432, 216, 85, 72, 144, 4, 1, 85, 1, 13, 0, 1, 0, 3, 13, 72],
  "641m²-680m²": [216, 85, 1, 1, 1, 1, 14, 1, 2, 1, 108, 2, 165, 15, 144, 267, 134, 14, 510, 255, 86, 72, 144, 4, 1, 85, 1, 14, 0, 1, 0, 3, 13, 72],
  "681m²-720m²": [224, 108, 1, 1, 1, 1, 14, 1, 2, 1, 117, 2, 171, 15, 182, 200, 100, 14, 587, 294, 95, 81, 182, 5, 1, 94, 1, 14, 0, 1, 0, 4, 13, 81],
  "721m²-760m²": [228, 95, 1, 1, 1, 1, 15, 1, 2, 1, 117, 2, 173, 16, 194, 344, 172, 15, 917, 459, 96, 81, 194, 5, 1, 95, 1, 15, 0, 1, 0, 4, 14, 81],
  "761m²-800m²": [240, 104, 1, 1, 1, 1, 16, 1, 2, 1, 153, 3, 178, 16, 229, 314, 157, 16, 1084, 542, 106, 90, 229, 6, 1, 104, 1, 16, 0, 1, 0, 5, 14, 90],
  "801m²-840m²": [248, 114, 1, 1, 1, 1, 17, 1, 2, 1, 162, 3, 180, 16, 234, 331, 166, 17, 1308, 654, 117, 100, 234, 6, 1, 114, 1, 17, 0, 1, 0, 5, 14, 100],
  "841m²-880m²": [256, 115, 1, 1, 1, 1, 18, 1, 2, 1, 162, 3, 179, 17, 273, 336, 168, 18, 1254, 627, 118, 100, 273, 7, 1, 115, 1, 18, 0, 1, 0, 6, 15, 100],
  "881m²-920m²": [260, 125, 1, 1, 1, 1, 18, 1, 2, 1, 165, 3, 207, 17, 279, 364, 182, 18, 1430, 715, 128, 110, 279, 7, 1, 125, 1, 18, 0, 1, 0, 6, 15, 110],
  "921m²-960m²": [268, 125, 1, 1, 1, 1, 19, 1, 2, 1, 171, 3, 201, 17, 290, 419, 210, 19, 1628, 814, 129, 110, 290, 7, 1, 125, 1, 19, 0, 1, 0, 6, 15, 110],
  "961m²-1000m²": [272, 126, 1, 1, 1, 1, 20, 1, 2, 1, 171, 3, 195, 18, 288, 382, 191, 20, 1778, 889, 130, 110, 288, 7, 1, 126, 1, 20, 0, 1, 0, 6, 16, 110],
};

// Helper to convert array to object with material keys
const getDefaultValuesForRange = (rangeLabel: string): Record<string, number> => {
  const values = DEFAULT_VALUES[rangeLabel] || [];
  const result: Record<string, number> = {};
  DEFAULT_MATERIALS.forEach((material, index) => {
    result[material.key] = values[index] || 0;
  });
  return result;
};

interface LineShopTemplatesGridProps {
  projectId: string;
  boqId: string;
}

type GridData = Record<string, Record<string, number | string>>;

export function LineShopTemplatesGrid({ projectId, boqId }: LineShopTemplatesGridProps) {
  const queryClient = useQueryClient();
  const [gridData, setGridData] = useState<GridData>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["line-shop-templates", projectId],
    queryFn: async () => {
      const { data: templatesData, error: templatesError } = await supabase
        .from("line_shop_material_templates")
        .select(`
          *,
          line_shop_template_items(*)
        `)
        .or(`project_id.eq.${projectId},is_global.eq.true`)
        .order("min_area", { ascending: true });
      
      if (templatesError) throw templatesError;
      return templatesData;
    },
  });

  // Initialize grid data from templates
  useEffect(() => {
    if (templates && templates.length > 0) {
      const data: GridData = {};
      
      templates.forEach((template) => {
        const rangeKey = template.area_label;
        data[rangeKey] = { db_size: template.db_size || "" };
        
        template.line_shop_template_items?.forEach((item: any) => {
          // Try to match by description
          const matchedMaterial = DEFAULT_MATERIALS.find(
            (m) => m.label.toLowerCase() === item.description?.toLowerCase()
          );
          if (matchedMaterial) {
            data[rangeKey][matchedMaterial.key] = item.quantity || 0;
          }
        });
      });
      
      setGridData(data);
    } else {
      // Initialize with pre-populated default data from spreadsheet
      const data: GridData = {};
      DEFAULT_AREA_RANGES.forEach((range) => {
        const defaultVals = getDefaultValuesForRange(range.label);
        data[range.label] = { 
          db_size: range.db_size,
          ...defaultVals
        };
      });
      setGridData(data);
    }
  }, [templates]);

  const handleCellChange = (rangeLabel: string, materialKey: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setGridData((prev) => ({
      ...prev,
      [rangeLabel]: {
        ...prev[rangeLabel],
        [materialKey]: numValue,
      },
    }));
    setHasChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing project templates
      await supabase
        .from("line_shop_material_templates")
        .delete()
        .eq("project_id", projectId);

      // Create new templates for each area range
      for (const range of DEFAULT_AREA_RANGES) {
        const rangeData = gridData[range.label];
        if (!rangeData) continue;

        // Create template
        const { data: template, error: templateError } = await supabase
          .from("line_shop_material_templates")
          .insert({
            project_id: projectId,
            min_area: range.min,
            max_area: range.max,
            area_label: range.label,
            db_size: range.db_size,
            is_global: false,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Create items for this template
        const items = DEFAULT_MATERIALS.map((material, index) => ({
          template_id: template.id,
          item_code: `LS.${index + 1}`,
          description: material.label,
          unit: material.unit,
          quantity: Number(rangeData[material.key]) || 0,
          category: material.category,
          display_order: index,
        })).filter((item) => item.quantity > 0);

        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from("line_shop_template_items")
            .insert(items);

          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Templates saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["line-shop-templates"] });
    },
    onError: (error) => {
      toast.error("Failed to save templates");
      console.error(error);
    },
  });

  // Group materials by category
  const materialsByCategory = useMemo(() => {
    const grouped: Record<string, typeof DEFAULT_MATERIALS> = {};
    DEFAULT_MATERIALS.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });
    return grouped;
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Line Shop Power & Lighting Templates</CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[1800px]">
            {/* Header Row with Area Ranges */}
            <div className="flex border-b border-border bg-muted/50 sticky top-0 z-10">
              <div className="w-64 shrink-0 p-2 font-medium text-xs border-r border-border sticky left-0 bg-muted/50 z-20">
                Material
              </div>
              <div className="w-16 shrink-0 p-2 font-medium text-xs text-center border-r border-border">
                Unit
              </div>
              {DEFAULT_AREA_RANGES.map((range) => (
                <div
                  key={range.label}
                  className="w-20 shrink-0 p-1 text-center border-r border-border"
                >
                  <div className="text-[10px] font-medium leading-tight">{range.label}</div>
                  <div className="text-[9px] text-muted-foreground">{range.db_size}</div>
                </div>
              ))}
            </div>

            {/* Material Rows by Category */}
            {Object.entries(materialsByCategory).map(([category, materials]) => (
              <div key={category}>
                {/* Category Header */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="flex-1 p-2 font-semibold text-xs text-primary uppercase tracking-wide">
                    {category}
                  </div>
                </div>

                {/* Material Rows */}
                {materials.map((material) => (
                  <div
                    key={material.key}
                    className="flex border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-64 shrink-0 p-2 text-xs border-r border-border sticky left-0 bg-background z-10 truncate">
                      {material.label}
                    </div>
                    <div className="w-16 shrink-0 p-2 text-xs text-center text-muted-foreground border-r border-border">
                      {material.unit}
                    </div>
                    {DEFAULT_AREA_RANGES.map((range) => (
                      <div
                        key={range.label}
                        className="w-20 shrink-0 border-r border-border/50"
                      >
                        <Input
                          type="number"
                          min="0"
                          value={gridData[range.label]?.[material.key] || 0}
                          onChange={(e) =>
                            handleCellChange(range.label, material.key, e.target.value)
                          }
                          className="h-8 w-full text-xs text-center border-0 rounded-none focus:ring-1 focus:ring-primary bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
