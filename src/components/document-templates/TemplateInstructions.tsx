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
          </div>

          <h4 className="text-sm font-semibold mt-4">Prepared For Section:</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_for_company{"}"}</code>
              <span className="text-muted-foreground">- Client company name</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_for_address{"}"}</code>
              <span className="text-muted-foreground">- Client address</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_for_contact{"}"}</code>
              <span className="text-muted-foreground">- Client contact person</span>
            </div>
          </div>

          <h4 className="text-sm font-semibold mt-4">Prepared By Section:</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_by_company{"}"}</code>
              <span className="text-muted-foreground">- Your company name</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_by_address{"}"}</code>
              <span className="text-muted-foreground">- Your company address</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">{"{"}prepared_by_contact{"}"}</code>
              <span className="text-muted-foreground">- Your contact person</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-semibold">Example Usage:</h4>
          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <p className="font-medium mb-2">In your Word document:</p>
            <p className="mb-1">PREPARED FOR:</p>
            <p><code className="text-primary">{"{"}prepared_for_company{"}"}</code></p>
            <p><code className="text-primary">{"{"}prepared_for_address{"}"}</code></p>
            <p className="mt-2 mb-1">PREPARED BY:</p>
            <p><code className="text-primary">{"{"}prepared_by_company{"}"}</code></p>
            <p><code className="text-primary">{"{"}prepared_by_address{"}"}</code></p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: For logos/images, you'll need to manually place them in your Word template. 
            Dynamic image replacement is not currently supported.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
