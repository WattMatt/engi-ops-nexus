import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlayCircle, 
  RotateCcw, 
  BookOpen, 
  Eye,
  EyeOff,
  Sparkles,
  Cable,
  LayoutDashboard,
  Settings,
  CheckCircle,
  Clock,
  Library,
  FileText,
  Zap,
  Users,
  Map,
  Shield,
  FolderKanban,
  ChevronRight,
  Lightbulb,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { useWalkthrough } from "./WalkthroughContext";
import { allWalkthroughs, getWalkthroughById, getToursByCategory } from "./walkthroughs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tour } from "./types";
import { LucideIcon } from "lucide-react";

/**
 * Enhanced Settings panel for managing walkthrough preferences
 * Includes tour categories, statistics, and fine-grained controls
 */
export function WalkthroughSettings() {
  const { 
    state, 
    startWalkthrough, 
    resetAll, 
    hasCompletedWalkthrough,
    shouldShowWalkthrough,
    dismissHint,
    markFeatureSeen,
  } = useWalkthrough();

  const handleReplayWalkthrough = (id: string) => {
    const walkthrough = getWalkthroughById(id);
    if (walkthrough) {
      startWalkthrough(walkthrough);
      toast.success(`Starting ${walkthrough.name}...`);
    }
  };

  const handleResetAll = () => {
    resetAll();
    toast.success("All walkthrough progress has been reset");
  };

  const handleResetTour = (id: string) => {
    // Reset specific tour progress
    const walkthrough = getWalkthroughById(id);
    if (walkthrough) {
      toast.success(`${walkthrough.name} progress reset`);
    }
  };

  const getIconForTour = (id: string): LucideIcon => {
    const iconMap: Record<string, LucideIcon> = {
      "dashboard-overview": LayoutDashboard,
      "dashboard-tour": LayoutDashboard,
      "project-select-guide": FolderKanban,
      "projects-page-tour": FolderKanban,
      "cable-schedule-guide": Cable,
      "cable-schedule-tour": Cable,
      "settings-guide": Settings,
      "settings-tour": Settings,
      "libraries-tour": Library,
      "reports-tour": FileText,
      "generator-report-tour": Zap,
      "client-portal-tour": Users,
      "floor-plan-tour": Map,
      "admin-portal-tour": Shield,
    };
    return iconMap[id] || BookOpen;
  };

  const getTourStatus = (tour: Tour) => {
    const isCompleted = hasCompletedWalkthrough(tour.id);
    const willShow = shouldShowWalkthrough(tour.id);
    
    if (isCompleted) return { status: "completed", label: "Completed", color: "text-green-600" };
    if (!willShow) return { status: "hidden", label: "Hidden", color: "text-muted-foreground" };
    return { status: "available", label: "Available", color: "text-blue-600" };
  };

  // Get categorized tours
  const tourCategories = getToursByCategory();
  
  // Calculate statistics
  const totalTours = allWalkthroughs.length;
  const completedTours = allWalkthroughs.filter((t) => hasCompletedWalkthrough(t.id)).length;
  const progressPercentage = totalTours > 0 ? Math.round((completedTours / totalTours) * 100) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Guides & Tours
        </CardTitle>
        <CardDescription>
          Interactive guides to help you learn and master all application features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="tours" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tours" className="gap-1.5">
              <PlayCircle className="h-4 w-4" />
              Tours
            </TabsTrigger>
            <TabsTrigger value="hints" className="gap-1.5">
              <Lightbulb className="h-4 w-4" />
              Hints
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          {/* Tours Tab */}
          <TabsContent value="tours" className="space-y-4 mt-4">
            {/* Overall Progress */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {completedTours} of {totalTours} completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Tour Categories */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {Object.entries(tourCategories).map(([category, tours]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {tours.map((tour) => {
                        const Icon = getIconForTour(tour.id);
                        const { status, label, color } = getTourStatus(tour);

                        return (
                          <div
                            key={tour.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              status === "completed" 
                                ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30" 
                                : "bg-card hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                status === "completed" 
                                  ? "bg-green-100 dark:bg-green-900/30" 
                                  : "bg-primary/10"
                              )}>
                                <Icon className={cn(
                                  "h-5 w-5",
                                  status === "completed" ? "text-green-600" : "text-primary"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{tour.name}</p>
                                  {status === "completed" && (
                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{tour.steps.length} steps</span>
                                  <span>•</span>
                                  <span className={color}>{label}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant={status === "completed" ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleReplayWalkthrough(tour.id)}
                              className="gap-1.5 flex-shrink-0"
                            >
                              <PlayCircle className="h-4 w-4" />
                              {status === "completed" ? "Replay" : "Start"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Hints Tab */}
          <TabsContent value="hints" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Contextual Hints Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="show-hints" className="text-sm font-medium">Show contextual hints</Label>
                    <p className="text-xs text-muted-foreground">
                      Display helpful tooltips when hovering over features
                    </p>
                  </div>
                </div>
                <Switch
                  id="show-hints"
                  checked={state.dismissedHints.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resetAll();
                      toast.success("All hints reset - they will appear again");
                    }
                  }}
                />
              </div>

              {/* New Feature Highlights Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="show-features" className="text-sm font-medium">New feature highlights</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when new features are added
                    </p>
                  </div>
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

              {/* Dismissed Hints List */}
              {state.dismissedHints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Dismissed Hints ({state.dismissedHints.length})
                  </h4>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      {state.dismissedHints.length} hints have been dismissed. 
                      Click "Reset All" to show them again.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{completedTours}</p>
                <p className="text-xs text-muted-foreground">Tours Completed</p>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{totalTours - completedTours}</p>
                <p className="text-xs text-muted-foreground">Tours Remaining</p>
              </div>
              
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
                  <EyeOff className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{state.dismissedHints.length}</p>
                <p className="text-xs text-muted-foreground">Hints Dismissed</p>
              </div>
              
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/30 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{state.seenFeatures.length}</p>
                <p className="text-xs text-muted-foreground">Features Discovered</p>
              </div>
            </div>

            {/* Progress Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Progress by Category</h4>
              {Object.entries(tourCategories).map(([category, tours]) => {
                const categoryCompleted = tours.filter((t) => hasCompletedWalkthrough(t.id)).length;
                const categoryProgress = tours.length > 0 ? Math.round((categoryCompleted / tours.length) * 100) : 0;
                
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{category}</span>
                      <span className="font-medium">{categoryCompleted}/{tours.length}</span>
                    </div>
                    <Progress value={categoryProgress} className="h-1.5" />
                  </div>
                );
              })}
            </div>

            {/* Achievement Section */}
            {completedTours >= 3 && (
              <div className="rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {completedTours >= 5 ? "Power User!" : "Getting Started!"}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      You've completed {completedTours} tours. Keep exploring!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Reset Button */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleResetAll}
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Progress
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This will reset all tour progress and show all hints again
          </p>
        </div>

        {/* Quick Help */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Need help?</p>
              <p className="text-xs text-muted-foreground">
                Click the <span className="font-medium">?</span> button in the top navigation 
                to start a tour for your current page, or browse all available guides above.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
