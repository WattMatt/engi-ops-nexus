import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DesignState } from "./types";
import { EQUIPMENT_LABELS } from "./constants";

interface EquipmentPanelProps {
  state: DesignState;
}

export const EquipmentPanel = ({ state }: EquipmentPanelProps) => {
  // Count equipment by type
  const equipmentCounts = state.equipment.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count cables by type
  const cableCounts = state.lines.reduce((acc, line) => {
    const key = `${line.type}${line.cableSize ? `-${line.cableSize}` : ''}`;
    if (!acc[key]) {
      acc[key] = { count: 0, totalLength: 0 };
    }
    acc[key].count += 1;
    acc[key].totalLength += line.lengthMeters || 0;
    return acc;
  }, {} as Record<string, { count: number; totalLength: number }>);

  // Count containment by type
  const containmentCounts = state.containment.reduce((acc, cont) => {
    const key = `${cont.type}${cont.size ? `-${cont.size}` : ''}`;
    if (!acc[key]) {
      acc[key] = { count: 0, totalLength: 0 };
    }
    acc[key].count += 1;
    acc[key].totalLength += cont.lengthMeters || 0;
    return acc;
  }, {} as Record<string, { count: number; totalLength: number }>);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Project Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="equipment" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="cables">Cables</TabsTrigger>
            <TabsTrigger value="containment">Containment</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(equipmentCounts).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-2 bg-accent/50 rounded">
                    <span className="text-sm font-medium">{EQUIPMENT_LABELS[type as any] || type}</span>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                ))}
                {Object.keys(equipmentCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No equipment placed</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cables" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(cableCounts).map(([key, data]) => (
                  <div key={key} className="p-2 bg-accent/50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{key.toUpperCase()}</span>
                      <span className="text-sm text-muted-foreground">{data.count} runs</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {data.totalLength.toFixed(1)}m
                    </div>
                  </div>
                ))}
                {Object.keys(cableCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No cables drawn</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="containment" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {Object.entries(containmentCounts).map(([key, data]) => (
                  <div key={key} className="p-2 bg-accent/50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{key}</span>
                      <span className="text-sm text-muted-foreground">{data.count} runs</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {data.totalLength.toFixed(1)}m
                    </div>
                  </div>
                ))}
                {Object.keys(containmentCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No containment drawn</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {state.tasks.map((task) => (
                  <div key={task.id} className="p-2 bg-accent/50 rounded">
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {task.status} | Assigned: {task.assigned_to || 'Unassigned'}
                    </div>
                  </div>
                ))}
                {state.tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks created</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
