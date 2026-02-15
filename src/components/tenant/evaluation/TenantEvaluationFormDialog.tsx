import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
}

interface TenantEvaluation {
  id: string;
  tenant_id: string;
  evaluation_date: string;
  evaluated_by: string;
  revision: number;
  status: string;
  comments?: string;
  [key: string]: any;
}

interface TenantEvaluationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  projectId: string;
  projectName: string;
  existingEvaluation?: TenantEvaluation | null;
  onSuccess: () => void;
}

type EvaluationOption = "yes" | "no" | "na" | null;

interface EvaluationFormData {
  evaluated_by: string;
  evaluation_date: string;
  // Tenant Design Pack
  tdp_db_position_indicated: EvaluationOption;
  tdp_db_distance_from_water: EvaluationOption;
  tdp_floor_points_indicated: EvaluationOption;
  tdp_floor_points_dimensioned: EvaluationOption;
  tdp_electrical_power_indicated: EvaluationOption;
  tdp_electrical_points_legend: EvaluationOption;
  tdp_electrical_points_dimensioned: EvaluationOption;
  tdp_lighting_indicated: EvaluationOption;
  tdp_ceiling_height_indicated: EvaluationOption;
  tdp_fittings_in_schedule: EvaluationOption;
  tdp_light_switch_position: EvaluationOption;
  tdp_signage_outlet: EvaluationOption;
  tdp_mechanical_ventilation: EvaluationOption;
  // Scope of Work
  sow_db_size_visible: EvaluationOption;
  sow_db_position_confirmed: EvaluationOption;
  sow_power_points_visible: EvaluationOption;
  sow_lighting_responsibility: EvaluationOption;
  // Comments
  comments: string;
}

const initialFormData: EvaluationFormData = {
  evaluated_by: "",
  evaluation_date: format(new Date(), "yyyy-MM-dd"),
  tdp_db_position_indicated: null,
  tdp_db_distance_from_water: null,
  tdp_floor_points_indicated: null,
  tdp_floor_points_dimensioned: null,
  tdp_electrical_power_indicated: null,
  tdp_electrical_points_legend: null,
  tdp_electrical_points_dimensioned: null,
  tdp_lighting_indicated: null,
  tdp_ceiling_height_indicated: null,
  tdp_fittings_in_schedule: null,
  tdp_light_switch_position: null,
  tdp_signage_outlet: null,
  tdp_mechanical_ventilation: null,
  sow_db_size_visible: null,
  sow_db_position_confirmed: null,
  sow_power_points_visible: null,
  sow_lighting_responsibility: null,
  comments: "",
};

const TDP_QUESTIONS = [
  { key: "tdp_db_position_indicated", label: "DB position indicated?", number: "1" },
  { key: "tdp_db_distance_from_water", label: "The distance from edge of DB to the nearest water point must be no less than 1200mm:", number: "2" },
  { key: "tdp_floor_points_indicated", label: "Any floor points indicated?", number: "3" },
  { key: "tdp_floor_points_dimensioned", label: 'If "Yes", are they sufficiently dimensioned?', number: "3.1" },
  { key: "tdp_electrical_power_indicated", label: "Electrical power indicated?", number: "4" },
  { key: "tdp_electrical_points_legend", label: "Are all electrical points clearly divided into legend?", number: "5" },
  { key: "tdp_electrical_points_dimensioned", label: "Does each electrical point have a dimension and height?", number: "6" },
  { key: "tdp_lighting_indicated", label: "Lighting Indicated?", number: "7" },
  { key: "tdp_ceiling_height_indicated", label: "If there is a ceiling, is the height indicated?", number: "8" },
  { key: "tdp_fittings_in_schedule", label: "Are all the fittings clearly divided in the lighting schedule?", number: "9" },
  { key: "tdp_light_switch_position", label: "Light switch position indicated?", number: "10" },
  { key: "tdp_signage_outlet", label: "Is there an electrical outlet for signage that has been indicated?", number: "11" },
  { key: "tdp_mechanical_ventilation", label: "Is the mechanical ventilation info available?", number: "12" },
];

const SOW_QUESTIONS = [
  { key: "sow_db_size_visible", label: "DB size clearly visible?", number: "1" },
  { key: "sow_db_position_confirmed", label: "DB position confirmed and checked in terms of minimum distance from Water point?", number: "2" },
  { key: "sow_power_points_visible", label: "Are all power points clearly visible and indicated?", number: "3" },
  { key: "sow_lighting_responsibility", label: "Are we responsible for Lighting?", number: "4" },
];

export function TenantEvaluationFormDialog({
  open,
  onOpenChange,
  tenant,
  projectId,
  projectName,
  existingEvaluation,
  onSuccess,
}: TenantEvaluationFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EvaluationFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch user profile for default evaluated_by
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      return profile;
    },
  });

  // Get next revision number
  const { data: nextRevision = 1 } = useQuery({
    queryKey: ["next-evaluation-revision", tenant?.id],
    queryFn: async () => {
      if (!tenant) return 1;
      
      const { data } = await supabase
        .from("tenant_evaluations")
        .select("revision")
        .eq("tenant_id", tenant.id)
        .order("revision", { ascending: false })
        .limit(1);
      
      return data && data.length > 0 ? data[0].revision + 1 : 1;
    },
    enabled: !!tenant && !existingEvaluation,
  });

  // Load existing evaluation data or set defaults
  useEffect(() => {
    if (existingEvaluation) {
      setFormData({
        evaluated_by: existingEvaluation.evaluated_by || "",
        evaluation_date: existingEvaluation.evaluation_date || format(new Date(), "yyyy-MM-dd"),
        tdp_db_position_indicated: existingEvaluation.tdp_db_position_indicated || null,
        tdp_db_distance_from_water: existingEvaluation.tdp_db_distance_from_water || null,
        tdp_floor_points_indicated: existingEvaluation.tdp_floor_points_indicated || null,
        tdp_floor_points_dimensioned: existingEvaluation.tdp_floor_points_dimensioned || null,
        tdp_electrical_power_indicated: existingEvaluation.tdp_electrical_power_indicated || null,
        tdp_electrical_points_legend: existingEvaluation.tdp_electrical_points_legend || null,
        tdp_electrical_points_dimensioned: existingEvaluation.tdp_electrical_points_dimensioned || null,
        tdp_lighting_indicated: existingEvaluation.tdp_lighting_indicated || null,
        tdp_ceiling_height_indicated: existingEvaluation.tdp_ceiling_height_indicated || null,
        tdp_fittings_in_schedule: existingEvaluation.tdp_fittings_in_schedule || null,
        tdp_light_switch_position: existingEvaluation.tdp_light_switch_position || null,
        tdp_signage_outlet: existingEvaluation.tdp_signage_outlet || null,
        tdp_mechanical_ventilation: existingEvaluation.tdp_mechanical_ventilation || null,
        sow_db_size_visible: existingEvaluation.sow_db_size_visible || null,
        sow_db_position_confirmed: existingEvaluation.sow_db_position_confirmed || null,
        sow_power_points_visible: existingEvaluation.sow_power_points_visible || null,
        sow_lighting_responsibility: existingEvaluation.sow_lighting_responsibility || null,
        comments: existingEvaluation.comments || "",
      });
    } else {
      setFormData({
        ...initialFormData,
        evaluated_by: userProfile?.full_name || "",
        evaluation_date: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }, [existingEvaluation, userProfile, open]);

  const handleFieldChange = (key: keyof EvaluationFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "completed") => {
      if (!tenant) throw new Error("No tenant selected");

      const evaluationData = {
        tenant_id: tenant.id,
        project_id: projectId,
        ...formData,
        status,
        revision: existingEvaluation ? existingEvaluation.revision : nextRevision,
      };

      if (existingEvaluation) {
        const { data, error } = await supabase
          .from("tenant_evaluations")
          .update(evaluationData)
          .eq("id", existingEvaluation.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("tenant_evaluations")
          .insert(evaluationData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-evaluations"] });
      toast.success("Evaluation saved successfully");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = async (status: "draft" | "completed") => {
    if (!formData.evaluated_by) {
      toast.error("Please enter the evaluator name");
      return;
    }
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(status);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!formData.evaluated_by) {
      toast.error("Please enter the evaluator name");
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Save the evaluation as completed (PDF generation handled separately via report history)
      const savedEvaluation = await saveMutation.mutateAsync("completed");

      queryClient.invalidateQueries({ queryKey: ["tenant-evaluation-report", savedEvaluation.id] });
      queryClient.invalidateQueries({ queryKey: ["tenant-evaluations"] });
      
      toast.success("Evaluation saved as completed");
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderQuestionRow = (question: { key: string; label: string; number: string }) => {
    const value = formData[question.key as keyof EvaluationFormData] as EvaluationOption;
    
    return (
      <div key={question.key} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-2 border-b last:border-b-0">
        <span className="text-sm font-medium w-8">{question.number}</span>
        <span className="text-sm">{question.label}</span>
        <RadioGroup
          value={value || ""}
          onValueChange={(v) => handleFieldChange(question.key as keyof EvaluationFormData, v as EvaluationOption)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1">
            <RadioGroupItem value="yes" id={`${question.key}-yes`} />
            <Label htmlFor={`${question.key}-yes`} className="text-sm cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="no" id={`${question.key}-no`} />
            <Label htmlFor={`${question.key}-no`} className="text-sm cursor-pointer">No</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="na" id={`${question.key}-na`} />
            <Label htmlFor={`${question.key}-na`} className="text-sm cursor-pointer">N/A</Label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Tenant Evaluation Form - {tenant.shop_number}
            {existingEvaluation && <span className="text-muted-foreground ml-2">Rev {existingEvaluation.revision}</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">PROJECT</Label>
                <p className="font-medium">{projectName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SHOP NAME</Label>
                <p className="font-medium">{tenant.shop_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SHOP NO</Label>
                <p className="font-medium">{tenant.shop_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">AREA</Label>
                <p className="font-medium">{tenant.area ? `${tenant.area} m²` : "-"}</p>
              </div>
            </div>

            {/* Evaluator Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="evaluation_date">Date</Label>
                <Input
                  id="evaluation_date"
                  type="date"
                  value={formData.evaluation_date}
                  onChange={(e) => handleFieldChange("evaluation_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluated_by">Evaluated By</Label>
                <Input
                  id="evaluated_by"
                  value={formData.evaluated_by}
                  onChange={(e) => handleFieldChange("evaluated_by", e.target.value)}
                  placeholder="Enter evaluator name"
                />
              </div>
            </div>

            <Separator />

            {/* Tenant Design Pack Section */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">TENANT DESIGN PACK :</h3>
              <div className="border rounded-lg p-4">
                {TDP_QUESTIONS.map(renderQuestionRow)}
              </div>
            </div>

            <Separator />

            {/* Scope of Work Section */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary">SCOPE OF WORK AND FINAL SITE LAYOUTS:</h3>
              <div className="border rounded-lg p-4">
                {SOW_QUESTIONS.map(renderQuestionRow)}
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">COMMENTS:</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleFieldChange("comments", e.target.value)}
                placeholder="Enter any comments or notes..."
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSaving || isGeneratingReport}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isSaving || isGeneratingReport}
          >
            {isGeneratingReport ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Save & Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
