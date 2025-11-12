import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, PieChart, BarChart3, TrendingUp, Table, ImagePlus } from "lucide-react";
import { AVAILABLE_COMPONENTS, ComponentLibraryItem } from "@/types/templateComponents";
import { useToast } from "@/hooks/use-toast";
import { captureAndUploadComponent } from "@/utils/componentCapture";

interface ComponentLibraryPanelProps {
  projectId: string;
  onComponentCaptured: (component: any) => void;
  reportId?: string;
}

const iconMap: Record<string, any> = {
  LayoutGrid,
  PieChart,
  BarChart3,
  TrendingUp,
  Table,
};

export const ComponentLibraryPanel = ({
  projectId,
  onComponentCaptured,
  reportId,
}: ComponentLibraryPanelProps) => {
  const { toast } = useToast();

  const handleCaptureComponent = async (item: ComponentLibraryItem) => {
    if (!reportId) {
      toast({
        title: "No Report Selected",
        description: "Please select or create a cost report to capture components",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Capturing Component",
        description: `Capturing ${item.name}... This may take a few seconds.`,
      });

      const result = await captureAndUploadComponent(
        item.elementId,
        item.componentType,
        item.id,
        projectId
      );

      const capturedComponent = {
        id: item.id,
        elementId: item.elementId,
        componentType: item.componentType,
        position: { x: 20, y: 50 }, // Default position
        size: item.defaultSize,
        imageUrl: result.imageUrl,
      };

      onComponentCaptured(capturedComponent);

      toast({
        title: "Component Captured",
        description: `${item.name} has been added to your template. You can now position it on the canvas.`,
      });
    } catch (error) {
      console.error("Capture error:", error);
      toast({
        title: "Capture Failed",
        description: error instanceof Error ? error.message : "Failed to capture component",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Component Library</CardTitle>
        <CardDescription className="text-xs">
          Click to capture and add components to your PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 p-4">
            {AVAILABLE_COMPONENTS.map((item) => {
              const Icon = iconMap[item.icon] || ImagePlus;
              
              return (
                <Button
                  key={item.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => handleCaptureComponent(item)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
