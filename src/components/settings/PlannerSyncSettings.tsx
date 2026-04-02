import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePlannerSyncSettings } from "@/hooks/usePlannerSyncSettings";
import { RefreshCw, ArrowLeftRight, ArrowRight, ArrowLeft, Clock, Repeat, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function PlannerSyncSettings() {
  const { settings, isLoading, updateSettings, isUpdating } = usePlannerSyncSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No Planner sync settings found. Please contact support.
        </CardContent>
      </Card>
    );
  }

  const directionIcon = {
    bidirectional: <ArrowLeftRight className="h-4 w-4" />,
    planner_to_nexus: <ArrowLeft className="h-4 w-4" />,
    nexus_to_planner: <ArrowRight className="h-4 w-4" />,
  };

  const directionLabel = {
    bidirectional: "Bidirectional (Planner ↔ Nexus)",
    planner_to_nexus: "Pull only (Planner → Nexus)",
    nexus_to_planner: "Push only (Nexus → Planner)",
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Microsoft Planner Integration</CardTitle>
                <CardDescription>
                  Synchronise roadmap items with Microsoft Planner tasks
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={settings.enabled ? "default" : "secondary"}>
                {settings.enabled ? "Active" : "Paused"}
              </Badge>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardHeader>
        {settings.updated_at && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Last updated: {format(new Date(settings.updated_at), "dd MMM yyyy, HH:mm")}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Sync Direction */}
      <Card className={!settings.enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {directionIcon[settings.sync_direction]}
            Sync Direction
          </CardTitle>
          <CardDescription>
            Control which direction data flows between Nexus and Planner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.sync_direction}
            onValueChange={(val) =>
              updateSettings({ sync_direction: val as any })
            }
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bidirectional">
                {directionLabel.bidirectional}
              </SelectItem>
              <SelectItem value="planner_to_nexus">
                {directionLabel.planner_to_nexus}
              </SelectItem>
              <SelectItem value="nexus_to_planner">
                {directionLabel.nexus_to_planner}
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            <p><strong>Bidirectional:</strong> Items sync both ways. Planner is authority for completions; Nexus for phases.</p>
            <p><strong>Pull only:</strong> Planner tasks update Nexus roadmap, but Nexus changes aren't pushed to Planner.</p>
            <p><strong>Push only:</strong> Nexus roadmap items are created/updated in Planner, but Planner changes aren't pulled.</p>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Settings */}
      <Card className={!settings.enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sync Frequency
          </CardTitle>
          <CardDescription>
            How often the sync processes run (changes apply on next scheduled run)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pull-freq">Pull frequency (Planner → Nexus)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pull-freq"
                  type="number"
                  min={1}
                  max={1440}
                  value={settings.sync_frequency_minutes}
                  onChange={(e) =>
                    updateSettings({
                      sync_frequency_minutes: Math.max(1, parseInt(e.target.value) || 60),
                    })
                  }
                  className="w-24"
                  disabled={isUpdating}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">Default: 60 minutes</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="push-freq">Push frequency (Nexus → Planner)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="push-freq"
                  type="number"
                  min={1}
                  max={1440}
                  value={settings.push_frequency_minutes}
                  onChange={(e) =>
                    updateSettings({
                      push_frequency_minutes: Math.max(1, parseInt(e.target.value) || 3),
                    })
                  }
                  className="w-24"
                  disabled={isUpdating}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">Default: 3 minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recurring Tasks */}
      <Card className={!settings.enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring Task Handling
          </CardTitle>
          <CardDescription>
            How recurring Planner tasks (Daily, Weekly, etc.) are handled during sync
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.handle_recurring_tasks}
            onValueChange={(val) =>
              updateSettings({ handle_recurring_tasks: val as any })
            }
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Skip — Don't push completions to recurring tasks</SelectItem>
              <SelectItem value="process">Process — Push completions normally (may cause respawn loops)</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">⚠ Recommended: Skip</p>
            <p>
              When a recurring Planner task is marked 100% complete, Planner automatically creates
              a new instance. If sync pushes completions to recurring tasks, it can create an infinite
              loop of completing and respawning. "Skip" prevents this by only adopting completions
              <em> from</em> Planner, never pushing them back.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
