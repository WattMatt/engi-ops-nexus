import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProjectData } from "./types";

interface ProjectOverviewProps {
  projectData: ProjectData;
}

export const ProjectOverview = ({ projectData }: ProjectOverviewProps) => {
  const equipmentCounts = projectData.equipment.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCableLength = projectData.cables.reduce(
    (sum, cable) => sum + (cable.lengthMeters || 0),
    0
  );

  const totalContainmentLength = projectData.containment.reduce(
    (sum, cont) => sum + (cont.lengthMeters || 0),
    0
  );

  const totalZoneArea = projectData.zones.reduce(
    (sum, zone) => sum + (zone.areaSqm || 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Project Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {/* Equipment Summary */}
            {Object.keys(equipmentCounts).length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Equipment</h4>
                <div className="space-y-1">
                  {Object.entries(equipmentCounts).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-muted-foreground capitalize">
                        {type.replace(/-/g, " ")}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(equipmentCounts).length > 0 && projectData.cables.length > 0 && (
              <Separator />
            )}

            {/* Cables Summary */}
            {projectData.cables.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Cables</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Routes</span>
                    <span className="font-medium">{projectData.cables.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Length</span>
                    <span className="font-medium">{totalCableLength.toFixed(1)}m</span>
                  </div>
                </div>
              </div>
            )}

            {projectData.cables.length > 0 && projectData.containment.length > 0 && (
              <Separator />
            )}

            {/* Containment Summary */}
            {projectData.containment.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Containment</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Routes</span>
                    <span className="font-medium">{projectData.containment.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Length</span>
                    <span className="font-medium">{totalContainmentLength.toFixed(1)}m</span>
                  </div>
                </div>
              </div>
            )}

            {projectData.containment.length > 0 && projectData.zones.length > 0 && (
              <Separator />
            )}

            {/* Zones Summary */}
            {projectData.zones.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Zones</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Zones</span>
                    <span className="font-medium">{projectData.zones.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Area</span>
                    <span className="font-medium">{totalZoneArea.toFixed(1)}m²</span>
                  </div>
                </div>
              </div>
            )}

            {projectData.zones.length > 0 && projectData.pvArrays.length > 0 && <Separator />}

            {/* PV Arrays Summary */}
            {projectData.pvArrays.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">PV Arrays</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Arrays</span>
                    <span className="font-medium">{projectData.pvArrays.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Panels</span>
                    <span className="font-medium">
                      {projectData.pvArrays.reduce(
                        (sum, arr) => sum + arr.rows * arr.columns,
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {Object.keys(equipmentCounts).length === 0 &&
              projectData.cables.length === 0 &&
              projectData.containment.length === 0 &&
              projectData.zones.length === 0 &&
              projectData.pvArrays.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No items placed yet. Start by selecting tools from the toolbar.
                </p>
              )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
