import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Plus, Trash2 } from "lucide-react";
import { DiaryFormData, WorkforceEntry } from "../DiaryEntryFormDialog";

interface WorkforceSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const COMMON_TRADES = [
  "General Labour",
  "Carpenter",
  "Electrician",
  "Plumber",
  "Mason/Bricklayer",
  "Steel Fixer",
  "Painter",
  "Plasterer",
  "Tiler",
  "HVAC Technician",
  "Welder",
  "Crane Operator",
  "Supervisor",
  "Safety Officer",
];

export const WorkforceSection = ({
  formData,
  updateFormData,
}: WorkforceSectionProps) => {
  const [newTrade, setNewTrade] = useState("");
  const [newCount, setNewCount] = useState("");
  const [newContractor, setNewContractor] = useState("");

  const addWorkforceEntry = () => {
    if (!newTrade || !newCount) return;

    const entry: WorkforceEntry = {
      trade: newTrade,
      count: parseInt(newCount) || 0,
      contractor: newContractor || undefined,
    };

    updateFormData({
      workforceDetails: [...formData.workforceDetails, entry],
    });

    setNewTrade("");
    setNewCount("");
    setNewContractor("");
  };

  const removeWorkforceEntry = (index: number) => {
    updateFormData({
      workforceDetails: formData.workforceDetails.filter((_, i) => i !== index),
    });
  };

  const quickAddTrade = (trade: string) => {
    setNewTrade(trade);
  };

  const totalWorkers = formData.workforceDetails.reduce(
    (sum, entry) => sum + entry.count,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Workforce on Site
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Record the number of workers by trade for daily attendance records
        </p>
      </div>

      {/* Quick Add Trades */}
      <div className="space-y-2">
        <Label className="text-sm">Quick Add Trade</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TRADES.map((trade) => (
            <Button
              key={trade}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => quickAddTrade(trade)}
              className="text-xs"
            >
              {trade}
            </Button>
          ))}
        </div>
      </div>

      {/* Add New Entry */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade">Trade</Label>
              <Input
                id="trade"
                placeholder="e.g., Electrician"
                value={newTrade}
                onChange={(e) => setNewTrade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                placeholder="0"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor">Contractor (Optional)</Label>
              <Input
                id="contractor"
                placeholder="Company name"
                value={newContractor}
                onChange={(e) => setNewContractor(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={addWorkforceEntry}
                disabled={!newTrade || !newCount}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workforce List */}
      {formData.workforceDetails.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Today's Workforce</Label>
            <span className="text-sm text-muted-foreground">
              Total: <span className="font-bold">{totalWorkers}</span> workers
            </span>
          </div>
          <div className="border rounded-lg divide-y">
            {formData.workforceDetails.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {entry.count}
                  </div>
                  <div>
                    <p className="font-medium">{entry.trade}</p>
                    {entry.contractor && (
                      <p className="text-sm text-muted-foreground">
                        {entry.contractor}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWorkforceEntry(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No workforce entries yet. Add trades and their counts above.
          </p>
        </div>
      )}
    </div>
  );
};
