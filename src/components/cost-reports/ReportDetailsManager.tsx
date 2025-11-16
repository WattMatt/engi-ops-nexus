import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Save, Edit2, X, Info } from "lucide-react";

interface ReportDetailsManagerProps {
  report: any;
}

interface DetailSection {
  id?: string;
  section_number: number;
  section_title: string;
  section_content: string;
  display_order: number;
}

const DEFAULT_SECTIONS: Omit<DetailSection, 'id'>[] = [
  { section_number: 1, section_title: "BASIS FOR COSTS", section_content: "The costs used herein are based on drawings and all information as at", display_order: 0 },
  { section_number: 2, section_title: "ESCALATION", section_content: "A fixed price contract has been awarded", display_order: 1 },
  { section_number: 3, section_title: "DRAWINGS", section_content: "The Cost Report is based on the information available to date. An allowance has been made for cost related items given as Site Instructions (variations) while they are being measured and priced", display_order: 2 },
  { section_number: 4, section_title: "EXCLUSIONS", section_content: "Value Added Tax", display_order: 3 },
  { section_number: 5, section_title: "CONSTRUCTION PERIOD", section_content: "", display_order: 4 },
  { section_number: 6, section_title: "PROFESSIONAL FEES", section_content: "These are listed separately and controlled via the PQS", display_order: 5 },
  { section_number: 7, section_title: "RENTABLE AREA", section_content: "Refer to latest architectural drawings", display_order: 6 },
  { section_number: 8, section_title: "CONTRACT INFORMATION", section_content: "", display_order: 7 },
  { section_number: 9, section_title: "DIRECT COSTS NOT REFLECTED IN COST REPORT", section_content: "Bulk Services and Contributions", display_order: 8 },
  { section_number: 10, section_title: "ITEMS PENDING NOT INCLUDED IN COST REPORT", section_content: "", display_order: 9 },
];

export const ReportDetailsManager = ({ report }: ReportDetailsManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DetailSection | null>(null);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["cost-report-details", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_report_details")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");
      
      if (error) throw error;
      
      // If no sections exist, initialize with defaults
      if (!data || data.length === 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("cost_report_details")
          .insert(
            DEFAULT_SECTIONS.map(section => ({
              ...section,
              cost_report_id: report.id,
            }))
          )
          .select();
        
        if (insertError) throw insertError;
        return inserted || [];
      }
      
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (section: DetailSection) => {
      if (!section.id) {
        const { error } = await supabase
          .from("cost_report_details")
          .insert({
            cost_report_id: report.id,
            section_number: section.section_number,
            section_title: section.section_title,
            section_content: section.section_content,
            display_order: section.display_order,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cost_report_details")
          .update({
            section_content: section.section_content,
          })
          .eq("id", section.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-report-details", report.id] });
      toast({ title: "Success", description: "Section updated successfully" });
      setEditingSection(null);
      setEditForm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startEditing = (section: any) => {
    setEditingSection(section.section_number);
    setEditForm(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditForm(null);
  };

  const saveSection = () => {
    if (editForm) {
      updateMutation.mutate(editForm);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
    </div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Report header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">COST REPORT DETAILS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">PROJECT NO. - </span>
                <span>{report.project_number}</span>
              </div>
              <div>
                <span className="font-medium">PROJECT NAME - </span>
                <span>{report.project_name}</span>
              </div>
              <div>
                <span className="font-medium">CLIENT - </span>
                <span>{report.client_name}</span>
              </div>
              <div>
                <span className="font-medium">DATE - </span>
                <span>{format(new Date(report.report_date), "dd MMMM yyyy")}</span>
              </div>
              <div>
                <span className="font-medium">COST REPORT NO. - </span>
                <span>{report.report_number}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. GENERAL</CardTitle>
          </CardHeader>
        </Card>

        {/* Editable sections */}
        {sections.map((section: any) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {section.section_number}. {section.section_title}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono text-xs">{`Detail_Section_${section.section_number}_Content`}</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              {editingSection === section.section_number ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveSection} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => startEditing(section)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === section.section_number && editForm ? (
                <Textarea
                  value={editForm.section_content || ""}
                  onChange={(e) => setEditForm({ ...editForm, section_content: e.target.value })}
                  rows={4}
                  className="w-full"
                />
              ) : (
                <div className="space-y-2">
                  {/* Special formatting for certain sections */}
                  {section.section_number === 1 && (
                    <p className="text-sm">
                      {section.section_content} {format(new Date(report.report_date), "dd MMMM yyyy")}
                    </p>
                  )}
                  {section.section_number === 5 && (
                    <div className="space-y-1 text-sm">
                      {report.site_handover_date && (
                        <p>
                          <span className="font-medium">Site handover: </span>
                          {format(new Date(report.site_handover_date), "dd MMMM yyyy")}
                        </p>
                      )}
                      {report.practical_completion_date && (
                        <p>
                          <span className="font-medium">Practical completion: </span>
                          {format(new Date(report.practical_completion_date), "dd MMMM yyyy")}
                        </p>
                      )}
                      {section.section_content && <p>{section.section_content}</p>}
                    </div>
                  )}
                  {section.section_number === 8 && (
                    <div className="space-y-1 text-sm">
                      {report.electrical_contractor && (
                        <p>
                          <span className="font-medium">Electrical Contractor: </span>
                          {report.electrical_contractor}
                        </p>
                      )}
                      {report.cctv_contractor && (
                        <p>
                          <span className="font-medium">CCTV Contractor: </span>
                          {report.cctv_contractor}
                        </p>
                      )}
                      {report.standby_plants_contractor && (
                        <p>
                          <span className="font-medium">Standby Plants Contractor: </span>
                          {report.standby_plants_contractor}
                        </p>
                      )}
                      {report.earthing_contractor && (
                        <p>
                          <span className="font-medium">Earthing Contractor: </span>
                          {report.earthing_contractor}
                        </p>
                      )}
                      {section.section_content && <p>{section.section_content}</p>}
                    </div>
                  )}
                  {section.section_number !== 1 && 
                   section.section_number !== 5 && 
                   section.section_number !== 8 && 
                   section.section_content && (
                    <p className="text-sm whitespace-pre-wrap">{section.section_content}</p>
                  )}
                  {!section.section_content && 
                   section.section_number !== 5 && 
                   section.section_number !== 8 && (
                    <p className="text-sm text-muted-foreground italic">No content added</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};