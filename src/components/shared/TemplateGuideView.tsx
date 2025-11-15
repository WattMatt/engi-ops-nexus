import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportTemplateType, getPlaceholdersByCategory } from "@/utils/reportTemplateSchemas";

interface TemplateGuideViewProps {
  report: any;
  templateType?: ReportTemplateType;
}

export const TemplateGuideView = ({ report, templateType = 'cover_page' }: TemplateGuideViewProps) => {
  const placeholdersByCategory = getPlaceholdersByCategory(templateType);
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
            Template Guide
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Click any placeholder to copy it to your clipboard. Use these exact placeholders in your Word template.
          </p>

          {/* Dynamic sections based on template type */}
          {Object.entries(placeholdersByCategory).map(([category, placeholders]) => (
            <div key={category} className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-foreground/80">{category}</h3>
              <div className="grid gap-3">
                {placeholders.map((placeholder) => (
                  <PlaceholderField 
                    key={placeholder.key}
                    label={placeholder.description}
                    value={report?.[placeholder.key] || `Example ${placeholder.description}`}
                    placeholder={`{${placeholder.placeholder.replace(/[{}]/g, '')}}`}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Logo Placeholders Guide */}
          <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  💡 Text Placeholders
                </h3>
                <p className="text-xs text-muted-foreground">
                  Use single curly braces <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                    {'{placeholder}'}
                  </code> in your Word template. The system will automatically replace these with actual values when generating PDFs.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  🖼️ Logo Placeholders
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  To add logos in your Word template:
                </p>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Insert any image in Word (as a placeholder)</li>
                  <li>Right-click the image → "Edit Alt Text" or "Format Picture"</li>
                  <li>Set the alt text to one of these exact values:</li>
                </ol>
                <div className="mt-3 space-y-2 ml-6">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                      company_logo
                    </code>
                    <span className="text-xs text-muted-foreground">→ Your company logo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                      client_logo
                    </code>
                    <span className="text-xs text-muted-foreground">→ Client logo</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Note: The placeholder image size in Word determines the final logo size in the PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
