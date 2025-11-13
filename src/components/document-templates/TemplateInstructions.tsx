import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TemplateInstructions() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          How to Create Templates with Placeholders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Placeholder Format</AlertTitle>
          <AlertDescription>
            Use curly braces to mark placeholders in your Word document: <code className="text-sm bg-muted px-1 py-0.5 rounded">{"{"}placeholder_name{"}"}</code>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Supported Placeholders:</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}project_name{"}"}</code>
              <span className="text-muted-foreground">- Project name</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}client_name{"}"}</code>
              <span className="text-muted-foreground">- Client name</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}report_title{"}"}</code>
              <span className="text-muted-foreground">- Report title</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}date{"}"}</code>
              <span className="text-muted-foreground">- Date</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}revision{"}"}</code>
              <span className="text-muted-foreground">- Revision number</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}description{"}"}</code>
              <span className="text-muted-foreground">- Description text</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-semibold">Example:</h4>
          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <p>Project Name: <code className="text-primary">{"{"}project_name{"}"}</code></p>
            <p>Client: <code className="text-primary">{"{"}client_name{"}"}</code></p>
            <p>Date: <code className="text-primary">{"{"}date{"}"}</code></p>
          </div>
          <p className="text-xs text-muted-foreground">
            When you fill the template with "Segonyana Mall", "ABC Properties", and "2025-01-15", 
            these placeholders will be replaced with your actual values in the generated PDF.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
