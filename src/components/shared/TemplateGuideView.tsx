import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TEMPLATE_PLACEHOLDERS } from "@/utils/templatePlaceholders";

interface TemplateGuideViewProps {
  report: any;
}

export const TemplateGuideView = ({ report }: TemplateGuideViewProps) => {
  const { toast } = useToast();

  const copyToClipboard = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast({
      title: "Copied!",
      description: `${placeholder} copied to clipboard`,
    });
  };

  const PlaceholderField = ({ 
    label, 
    placeholder, 
    value 
  }: { 
    label: string; 
    placeholder: string; 
    value?: string;
  }) => (
    <div className="group relative p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {label}
          </div>
          {value && (
            <div className="text-sm font-medium text-foreground mb-2 break-words">
              {value}
            </div>
          )}
          <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
            {placeholder}
          </code>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => copyToClipboard(placeholder)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full overflow-auto bg-muted/30">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-border">
            Cover Page Template Guide
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Click any placeholder to copy it to your clipboard. Use these exact placeholders in your Word template.
          </p>

          {/* Project Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-foreground/80">Project Information</h3>
            <div className="grid gap-3">
              <PlaceholderField 
                label="Project Name" 
                placeholder="{project_name}"
                value={report?.projects?.name}
              />
              <PlaceholderField 
                label="Report Title" 
                placeholder="{report_title}"
                value={report?.report_name}
              />
              <PlaceholderField 
                label="Report Date" 
                placeholder="{report_date}"
                value={new Date().toLocaleDateString()}
              />
              <PlaceholderField 
                label="Current Date" 
                placeholder="{date}"
                value={new Date().toLocaleDateString()}
              />
              <PlaceholderField 
                label="Revision Number" 
                placeholder="{revision}"
                value="1.0"
              />
              <PlaceholderField 
                label="Subtitle" 
                placeholder="{subtitle}"
                value="Cost Report"
              />
            </div>
          </div>

          {/* Prepared By */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-foreground/80">Prepared By (Your Company)</h3>
            <div className="grid gap-3">
              <PlaceholderField 
                label="Company Name" 
                placeholder="{company_name}"
                value="Your Company"
              />
              <PlaceholderField 
                label="Contact Name" 
                placeholder="{contact_name}"
                value="Contact Person"
              />
              <PlaceholderField 
                label="Contact Phone" 
                placeholder="{contact_phone}"
                value="+27 123 456 789"
              />
            </div>
          </div>

          {/* Prepared For */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80">Prepared For (Client Information)</h3>
            <div className="grid gap-3">
              <PlaceholderField 
                label="Client Company Name" 
                placeholder="{prepared_for_company}"
                value="Client Organization"
              />
              <PlaceholderField 
                label="Client Contact Person" 
                placeholder="{prepared_for_contact}"
                value="Client Contact"
              />
              <PlaceholderField 
                label="Client Address Line 1" 
                placeholder="{prepared_for_address}"
                value="123 Main Street"
              />
              <PlaceholderField 
                label="Client Address Line 2" 
                placeholder="{prepared_for_address2}"
                value="Suite 100"
              />
              <PlaceholderField 
                label="Client Phone" 
                placeholder="{prepared_for_tel}"
                value="+27 987 654 321"
              />
              <PlaceholderField 
                label="Client Email" 
                placeholder="{prepared_for_email}"
                value="client@example.com"
              />
            </div>
          </div>
        </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-2">💡 Text Placeholders</h4>
              <p className="text-xs text-muted-foreground">
                Use single curly braces <code className="text-primary">{"{placeholder}"}</code> in your Word template. 
                The system will automatically replace these with actual values when generating PDFs.
              </p>
            </div>
            
            <div className="border-t border-primary/20 pt-3">
              <h4 className="text-sm font-semibold mb-2">🖼️ Logo Placeholders</h4>
              <p className="text-xs text-muted-foreground mb-2">
                To add logos in your Word template:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Insert any image in Word (as a placeholder)</li>
                <li>Right-click the image → "Edit Alt Text" or "Format Picture"</li>
                <li>Set the alt text to one of these exact values:</li>
              </ol>
              <div className="mt-2 space-y-1 ml-4">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">company_logo</code>
                  <span className="text-xs text-muted-foreground">→ Your company logo</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">client_logo</code>
                  <span className="text-xs text-muted-foreground">→ Client logo</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The placeholder image size in Word determines the final logo size in the PDF.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
};
