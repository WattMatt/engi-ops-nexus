import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Save } from "lucide-react";
import { toast } from "sonner";

const FloorPlan = () => {
  const [projectId] = useState(localStorage.getItem("selectedProjectId"));

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please select a project first</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Floor Plan Markup Tool
          </h1>
          <p className="text-muted-foreground">
            Upload floor plans and add electrical equipment, routes, and zones
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Load PDF
          </Button>
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Main Canvas Area */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg aspect-[4/3] flex items-center justify-center">
                <p className="text-muted-foreground">
                  Click "Load PDF" to begin
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Overview Panel */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Equipment and quantities will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Load PDF Floor Plan</h4>
            <p className="text-sm text-muted-foreground">
              Click "Load PDF" to upload your architectural floor plan
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Select Design Purpose</h4>
            <p className="text-sm text-muted-foreground">
              Choose from Budget Markup, PV Design, or Line Shop Measurements
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Set Scale</h4>
            <p className="text-sm text-muted-foreground">
              Calibrate measurements by marking a known distance
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. Add Equipment & Routes</h4>
            <p className="text-sm text-muted-foreground">
              Use the toolbar to place equipment, draw cables, and define zones
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FloorPlan;
