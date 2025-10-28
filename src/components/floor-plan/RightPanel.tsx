import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RightPanel() {
  const { state } = useFloorPlan();

  const equipmentCount = state.equipment.length;
  const cablesCount = state.cables.length;
  const zonesCount = state.zones.length;
  const tasksCount = state.tasks.length;

  const totalCableLength = state.cables.reduce((sum, cable) => sum + (cable.lengthMeters || 0), 0);
  const totalZoneArea = state.zones.reduce((sum, zone) => sum + (zone.areaSqm || 0), 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">
          {state.designPurpose || 'No design purpose selected'}
        </p>
      </div>

      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="cables">Cables</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="summary" className="mt-0 space-y-4">
            {!state.selectedItem ? (
              <>
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Equipment</span>
                      <Badge variant="secondary">{equipmentCount}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cables</span>
                      <Badge variant="secondary">{cablesCount}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Cable Length</span>
                      <Badge variant="secondary">{totalCableLength.toFixed(2)}m</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Zones</span>
                      <Badge variant="secondary">{zonesCount}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Zone Area</span>
                      <Badge variant="secondary">{totalZoneArea.toFixed(2)}m²</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tasks</span>
                      <Badge variant="secondary">{tasksCount}</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <p className="text-sm text-muted-foreground">
                    {!state.scaleMetersPerPixel 
                      ? 'Set the scale first by selecting the Scale tool and drawing a line between two known points.'
                      : 'Select a tool from the left toolbar to begin marking up the floor plan.'}
                  </p>
                </Card>
              </>
            ) : (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Selected Item</h3>
                <p className="text-sm text-muted-foreground">
                  Type: {state.selectedItem.type}
                </p>
                <p className="text-sm text-muted-foreground">
                  ID: {state.selectedItem.id}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Equipment List</h3>
              {equipmentCount === 0 ? (
                <p className="text-sm text-muted-foreground">No equipment placed yet</p>
              ) : (
                <div className="space-y-2">
                  {state.equipment.map(item => (
                    <div key={item.id} className="text-sm p-2 rounded bg-muted/50">
                      <div className="font-medium">{item.type}</div>
                      {item.label && (
                        <div className="text-muted-foreground text-xs">{item.label}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="cables" className="mt-0">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Cable Routes</h3>
              {cablesCount === 0 ? (
                <p className="text-sm text-muted-foreground">No cables drawn yet</p>
              ) : (
                <div className="space-y-2">
                  {state.cables.map(cable => (
                    <div key={cable.id} className="text-sm p-2 rounded bg-muted/50">
                      <div className="flex justify-between">
                        <span className="font-medium">{cable.cableType}</span>
                        <Badge variant="outline">{cable.lengthMeters?.toFixed(2)}m</Badge>
                      </div>
                      {cable.fromLabel && cable.toLabel && (
                        <div className="text-muted-foreground text-xs">
                          {cable.fromLabel} → {cable.toLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Tasks</h3>
              {tasksCount === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks created yet</p>
              ) : (
                <div className="space-y-2">
                  {state.tasks.map(task => (
                    <div key={task.id} className="text-sm p-2 rounded bg-muted/50">
                      <div className="font-medium">{task.title}</div>
                      <Badge 
                        variant={task.status === 'Completed' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
