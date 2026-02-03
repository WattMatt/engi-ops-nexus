import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Shield, ChevronDown, ChevronRight, FileCheck, AlertTriangle, 
  CheckCircle2, Clock, FileText, Save, Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SANS10142ComplianceChecklistProps {
  projectId: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  documentTypes?: string[];
}

interface ChecklistSection {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

// SANS 10142 Compliance Structure
const SANS10142_SECTIONS: ChecklistSection[] = [
  {
    id: "part1_lv",
    title: "SANS 10142 Part 1 - LV Installations",
    description: "Low voltage installation requirements up to 1000V AC",
    items: [
      { id: "coc_issued", label: "Certificate of Compliance (COC) issued", documentTypes: ["compliance_certs", "test_certificates"] },
      { id: "inspection_checklist", label: "Installation inspection checklist completed", documentTypes: ["test_certificates"] },
      { id: "test_records", label: "Test records available", documentTypes: ["test_certificates"] },
      { id: "insulation_resistance", label: "Insulation resistance tests completed", documentTypes: ["test_certificates"] },
      { id: "earth_continuity", label: "Earth continuity tests completed", documentTypes: ["test_certificates"] },
      { id: "polarity_test", label: "Polarity verification completed", documentTypes: ["test_certificates"] },
      { id: "loop_impedance", label: "Earth fault loop impedance tests completed", documentTypes: ["test_certificates"] },
      { id: "rcd_tests", label: "RCD operation tests completed", documentTypes: ["test_certificates"] },
      { id: "phase_sequence", label: "Phase sequence verification completed", documentTypes: ["test_certificates"] },
      { id: "voltage_drop", label: "Voltage drop calculations verified", documentTypes: ["specifications"] },
    ],
  },
  {
    id: "part2_mv",
    title: "SANS 10142 Part 2 - MV Installations",
    description: "Medium voltage installation requirements above 1000V AC",
    items: [
      { id: "mv_coc", label: "MV Certificate of Compliance issued", documentTypes: ["compliance_certs"] },
      { id: "health_safety_file", label: "Health & Safety file prepared", documentTypes: ["compliance_certs"] },
      { id: "protection_coordination", label: "Protection coordination study completed", documentTypes: ["specifications", "main_boards"] },
      { id: "mv_switching_procedures", label: "MV switching procedures documented", documentTypes: ["manuals"] },
      { id: "arc_flash_study", label: "Arc flash hazard analysis completed", documentTypes: ["specifications"] },
      { id: "mv_maintenance_manual", label: "MV maintenance manual available", documentTypes: ["manuals"] },
      { id: "interlocking_verification", label: "Interlocking systems verified", documentTypes: ["test_certificates"] },
      { id: "relay_settings", label: "Protection relay settings documented", documentTypes: ["main_boards", "specifications"] },
    ],
  },
  {
    id: "occupancy",
    title: "Occupancy Certificate Requirements",
    description: "Documentation required for building occupancy approval",
    items: [
      { id: "municipal_approval", label: "Municipal electrical approval obtained", documentTypes: ["compliance_certs"] },
      { id: "supply_authority_approval", label: "Supply authority approval received", documentTypes: ["compliance_certs"] },
      { id: "ecsa_registered", label: "ECSA registered person signed off", documentTypes: ["compliance_certs"] },
      { id: "as_built_drawings", label: "As-built drawings submitted", documentTypes: ["as_built"] },
      { id: "emergency_lighting", label: "Emergency lighting certificate", documentTypes: ["test_certificates", "emergency_systems"] },
      { id: "fire_detection", label: "Fire detection system certificate", documentTypes: ["compliance_certs"] },
    ],
  },
  {
    id: "documentation",
    title: "General Documentation",
    description: "Standard documentation requirements",
    items: [
      { id: "single_line_diagrams", label: "Single line diagrams complete", documentTypes: ["as_built", "main_boards"] },
      { id: "cable_schedules", label: "Cable schedules complete", documentTypes: ["cable_installation"] },
      { id: "load_schedules", label: "Load schedules complete", documentTypes: ["specifications"] },
      { id: "om_manuals", label: "O&M manuals available", documentTypes: ["manuals"] },
      { id: "warranties", label: "Equipment warranties on file", documentTypes: ["warranties"] },
      { id: "commissioning_reports", label: "Commissioning reports complete", documentTypes: ["commissioning_docs"] },
    ],
  },
];

interface ComplianceData {
  completed_items: string[];
  notes: Record<string, string>;
  last_updated: string;
}

export function SANS10142ComplianceChecklist({ projectId }: SANS10142ComplianceChecklistProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["part1_lv"]));
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing compliance data
  const { data: complianceData, isLoading } = useQuery({
    queryKey: ["sans10142-compliance", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_metadata")
        .select("value")
        .eq("project_id", projectId)
        .eq("key", "sans10142_compliance")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      const compData = (data?.value as unknown) as ComplianceData | null;
      if (compData) {
        setCompletedItems(new Set(compData.completed_items || []));
        setLocalNotes(compData.notes || {});
      }
      return compData;
    },
  });

  // Fetch document counts per category
  const { data: documentCounts } = useQuery({
    queryKey: ["handover-doc-counts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents")
        .select("document_type")
        .eq("project_id", projectId);

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      for (const doc of data || []) {
        const type = doc.document_type || "other";
        counts[type] = (counts[type] || 0) + 1;
      }
      return counts;
    },
  });

  // Save compliance data
  const saveMutation = useMutation({
    mutationFn: async () => {
      const complianceValue: ComplianceData = {
        completed_items: Array.from(completedItems),
        notes: localNotes,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("project_metadata")
        .upsert({
          project_id: projectId,
          key: "sans10142_compliance",
          value: complianceValue as any,
        }, {
          onConflict: "project_id,key",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Compliance checklist saved" });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["sans10142-compliance", projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving checklist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleItem = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
    setHasChanges(true);
  };

  const updateNote = (itemId: string, note: string) => {
    setLocalNotes((prev) => ({ ...prev, [itemId]: note }));
    setHasChanges(true);
  };

  const getSectionProgress = (section: ChecklistSection) => {
    const completed = section.items.filter((item) => completedItems.has(item.id)).length;
    return {
      completed,
      total: section.items.length,
      percentage: Math.round((completed / section.items.length) * 100),
    };
  };

  const getOverallProgress = () => {
    const allItems = SANS10142_SECTIONS.flatMap((s) => s.items);
    const completed = allItems.filter((item) => completedItems.has(item.id)).length;
    return {
      completed,
      total: allItems.length,
      percentage: Math.round((completed / allItems.length) * 100),
    };
  };

  const hasDocumentsForItem = (item: ChecklistItem): boolean => {
    if (!item.documentTypes || !documentCounts) return false;
    return item.documentTypes.some((type) => (documentCounts[type] || 0) > 0);
  };

  const overall = getOverallProgress();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading compliance data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              SANS 10142 Compliance Checklist
            </CardTitle>
            <CardDescription>
              Track compliance with South African electrical installation standards
            </CardDescription>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Compliance Progress</span>
            <Badge variant={overall.percentage === 100 ? "default" : "secondary"}>
              {overall.completed}/{overall.total} items
            </Badge>
          </div>
          <Progress value={overall.percentage} className="h-3" />
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {overall.completed} completed
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-amber-500" />
              {overall.total - overall.completed} pending
            </span>
          </div>
        </div>

        {/* Section Checklists */}
        <div className="space-y-4">
          {SANS10142_SECTIONS.map((section) => {
            const progress = getSectionProgress(section);
            const isExpanded = expandedSections.has(section.id);

            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <h4 className="font-medium">{section.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={progress.percentage} className="w-24 h-2" />
                        <Badge
                          variant={progress.percentage === 100 ? "default" : "outline"}
                        >
                          {progress.completed}/{progress.total}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator />
                    <div className="p-4 space-y-4">
                      {section.items.map((item) => {
                        const isCompleted = completedItems.has(item.id);
                        const hasDocuments = hasDocumentsForItem(item);

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              isCompleted
                                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                                : "bg-background"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={item.id}
                                checked={isCompleted}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label
                                    htmlFor={item.id}
                                    className={cn(
                                      "font-medium cursor-pointer",
                                      isCompleted && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {item.label}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    {hasDocuments ? (
                                      <Badge variant="outline" className="text-xs">
                                        <FileCheck className="h-3 w-3 mr-1" />
                                        Docs available
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        No docs
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                                <div>
                                  <Textarea
                                    placeholder="Add notes..."
                                    value={localNotes[item.id] || ""}
                                    onChange={(e) => updateNote(item.id, e.target.value)}
                                    className="text-sm h-16 resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Last Updated */}
        {complianceData?.last_updated && (
          <p className="text-xs text-muted-foreground text-right">
            Last updated: {new Date(complianceData.last_updated).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
