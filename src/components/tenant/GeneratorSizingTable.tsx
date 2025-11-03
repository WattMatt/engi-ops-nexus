import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Pencil, Save, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface GeneratorSizingTableProps {
  projectId?: string;
}

interface SizingData {
  id?: string;
  rating: string;
  load_25: number;
  load_50: number;
  load_75: number;
  load_100: number;
}

export function GeneratorSizingTable({ projectId }: GeneratorSizingTableProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<SizingData[]>([]);

  // Fetch custom sizing data for project
  const { data: customData, refetch } = useQuery({
    queryKey: ["generator-sizing-data", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("generator_sizing_data")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Merge custom data with defaults
  const displayData = projectId && customData && customData.length > 0
    ? customData.map(item => ({
        id: item.id,
        rating: item.rating,
        load_25: item.load_25,
        load_50: item.load_50,
        load_75: item.load_75,
        load_100: item.load_100,
      }))
    : GENERATOR_SIZING_TABLE.map((item, index) => ({
        rating: item.rating,
        load_25: item.load25,
        load_50: item.load50,
        load_75: item.load75,
        load_100: item.load100,
      }));

  useEffect(() => {
    setEditData(displayData);
  }, [customData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) return;
      
      // Prepare data for upsert
      const dataToSave = editData.map((item, index) => ({
        project_id: projectId,
        rating: item.rating,
        load_25: Number(item.load_25),
        load_50: Number(item.load_50),
        load_75: Number(item.load_75),
        load_100: Number(item.load_100),
        display_order: index,
      }));

      const { error } = await supabase
        .from("generator_sizing_data")
        .upsert(dataToSave, {
          onConflict: "project_id,rating"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generator-sizing-data"] });
      toast.success("Generator sizing data saved");
      setIsEditing(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) return;
      
      const { error } = await supabase
        .from("generator_sizing_data")
        .delete()
        .eq("project_id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generator-sizing-data"] });
      toast.success("Reset to default values");
      setIsEditing(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset");
    },
  });

  const handleEdit = () => {
    setEditData(displayData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData(displayData);
    setIsEditing(false);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default values? This will remove all custom data.")) {
      resetMutation.mutate();
    }
  };

  const updateValue = (index: number, field: keyof SizingData, value: number) => {
    const updated = [...editData];
    updated[index] = { ...updated[index], [field]: value };
    setEditData(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generator Sizing & Consumption Reference</CardTitle>
            <CardDescription>
              Fuel consumption rates (L/hr) at different load percentages
            </CardDescription>
          </div>
          {projectId && (
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {customData && customData.length > 0 && (
                    <Button 
                      onClick={handleReset} 
                      variant="outline" 
                      size="sm"
                      disabled={resetMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline" 
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    size="sm"
                    disabled={saveMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Generator Rating</TableHead>
              <TableHead className="text-right font-semibold">25% Load</TableHead>
              <TableHead className="text-right font-semibold">50% Load</TableHead>
              <TableHead className="text-right font-semibold">75% Load</TableHead>
              <TableHead className="text-right font-semibold">100% Load</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isEditing ? editData : displayData).map((row, index) => (
              <TableRow key={row.rating}>
                <TableCell className="font-medium">{row.rating}</TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={row.load_25}
                      onChange={(e) => updateValue(index, 'load_25', Number(e.target.value))}
                      className="w-24 text-right"
                    />
                  ) : (
                    row.load_25
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={row.load_50}
                      onChange={(e) => updateValue(index, 'load_50', Number(e.target.value))}
                      className="w-24 text-right"
                    />
                  ) : (
                    row.load_50
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={row.load_75}
                      onChange={(e) => updateValue(index, 'load_75', Number(e.target.value))}
                      className="w-24 text-right"
                    />
                  ) : (
                    row.load_75
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={row.load_100}
                      onChange={(e) => updateValue(index, 'load_100', Number(e.target.value))}
                      className="w-24 text-right"
                    />
                  ) : (
                    row.load_100
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
