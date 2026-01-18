import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  PlayCircle, 
  RotateCcw, 
  BookOpen, 
  Eye,
  EyeOff,
  Sparkles,
  Cable,
  LayoutDashboard,
  Settings
} from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { allWalkthroughs, getWalkthroughById } from "./walkthroughs";
import { toast } from "sonner";

/**
 * Settings panel for managing walkthrough preferences
 * Can be embedded in the Settings page
 */
export function WalkthroughSettings() {
  const { 
    state, 
    startWalkthrough, 
    resetAll, 
    hasCompletedWalkthrough,
    shouldShowWalkthrough 
  } = useWalkthrough();

  const handleReplayWalkthrough = (id: string) => {
    const walkthrough = getWalkthroughById(id);
    if (walkthrough) {
      startWalkthrough(walkthrough);
    }
  };

  const handleResetAll = () => {
    resetAll();
    toast.success("All walkthrough progress has been reset");
  };

  const getIconForWalkthrough = (id: string) => {
    switch (id) {
      case "dashboard-overview":
        return LayoutDashboard;
      case "project-select-guide":
        return BookOpen;
      case "cable-schedule-guide":
        return Cable;
      case "settings-guide":
        return Settings;
      default:
        return Sparkles;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Guided Walkthroughs
        </CardTitle>
        <CardDescription>
          Interactive guides to help you learn the application features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Walkthroughs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Guides</h4>
          <div className="grid gap-3">
            {allWalkthroughs.map((walkthrough) => {
              const Icon = getIconForWalkthrough(walkthrough.id);
              const isCompleted = hasCompletedWalkthrough(walkthrough.id);
              const willShow = shouldShowWalkthrough(walkthrough.id);

              return (
                <div
                  key={walkthrough.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{walkthrough.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {walkthrough.steps.length} steps
                        {isCompleted && (
                          <span className="ml-2 text-green-600">• Completed</span>
                        )}
                        {!willShow && !isCompleted && (
                          <span className="ml-2 text-muted-foreground">• Hidden</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReplayWalkthrough(walkthrough.id)}
                    className="gap-1"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {isCompleted ? "Replay" : "Start"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Hint Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Tooltip Hints</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-hints" className="text-sm">Show contextual hints</Label>
              <p className="text-xs text-muted-foreground">
                Display helpful tooltips on first use of features
              </p>
            </div>
            <Switch
              id="show-hints"
              checked={state.dismissedHints.length === 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  resetAll();
                  toast.success("Hints reset - they will appear again");
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-features" className="text-sm">New feature highlights</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when new features are added
              </p>
            </div>
            <Switch
              id="show-features"
              checked={state.seenFeatures.length === 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  toast.info("Feature highlights will appear for new features");
                }
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {Object.values(state.progress).filter((p) => p.completed).length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {state.dismissedHints.length}
            </p>
            <p className="text-xs text-muted-foreground">Hints Dismissed</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {state.seenFeatures.length}
            </p>
            <p className="text-xs text-muted-foreground">Features Seen</p>
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleResetAll}
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Progress
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            This will show all walkthroughs and hints again
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
