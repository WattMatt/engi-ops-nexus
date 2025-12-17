import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Lightbulb } from "lucide-react";
import { ZoneManager } from "./ZoneManager";
import { FittingSelector } from "./FittingSelector";

interface LightingScheduleTabProps {
  projectId: string | null;
}

export function LightingScheduleTab({ projectId }: LightingScheduleTabProps) {
  const [activeTab, setActiveTab] = useState("zones");

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Please select a project to manage lighting schedules.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lighting Schedule</h2>
        <p className="text-muted-foreground">
          Define zones, assign fittings, and manage project lighting requirements.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="zones" className="gap-2">
            <MapPin className="h-4 w-4" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="fittings" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Assign Fittings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-6">
          <ZoneManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="fittings" className="mt-6">
          <FittingSelector projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
