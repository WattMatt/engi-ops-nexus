import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PlaceholderGroup {
  title: string;
  description: string;
  placeholders: { name: string; description: string }[];
}

const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    title: "Project Information",
    description: "Basic project details",
    placeholders: [
      { name: "{{project_name}}", description: "Project name" },
      { name: "{{project_number}}", description: "Project reference number" },
      { name: "{{client_name}}", description: "Client company name" },
      { name: "{{report_number}}", description: "Cost report number" },
      { name: "{{report_date}}", description: "Report generation date" },
    ],
  },
  {
    title: "Dates",
    description: "Project timeline dates",
    placeholders: [
      { name: "{{site_handover_date}}", description: "Site handover date" },
      { name: "{{practical_completion_date}}", description: "Practical completion date" },
    ],
  },
  {
    title: "Contractors",
    description: "Contractor information",
    placeholders: [
      { name: "{{electrical_contractor}}", description: "Electrical contractor name" },
      { name: "{{earthing_contractor}}", description: "Earthing contractor name" },
      { name: "{{standby_plants_contractor}}", description: "Standby plants contractor name" },
      { name: "{{cctv_contractor}}", description: "CCTV contractor name" },
    ],
  },
  {
    title: "Financial Totals",
    description: "Summary financial figures",
    placeholders: [
      { name: "{{total_original_budget}}", description: "Total original budget amount" },
      { name: "{{total_anticipated_final}}", description: "Total anticipated final amount" },
      { name: "{{total_variance}}", description: "Total variance amount" },
      { name: "{{total_variations}}", description: "Total variations amount" },
    ],
  },
  {
    title: "Other Fields",
    description: "Additional information",
    placeholders: [
      { name: "{{notes}}", description: "Report notes and comments" },
    ],
  },
];

const LOOP_GROUPS = [
  {
    title: "Categories Loop",
    description: "Iterate through cost categories",
    syntax: "{#categories}...{/categories}",
    fields: [
      { name: "{code}", description: "Category code" },
      { name: "{description}", description: "Category description" },
      { name: "{original_budget}", description: "Original budget amount" },
      { name: "{anticipated_final}", description: "Anticipated final amount" },
      { name: "{variance}", description: "Variance amount" },
    ],
  },
  {
    title: "Line Items Loop (nested in categories)",
    description: "Iterate through line items within each category",
    syntax: "{#line_items}...{/line_items}",
    fields: [
      { name: "{code}", description: "Line item code" },
      { name: "{description}", description: "Line item description" },
      { name: "{original_budget}", description: "Original budget amount" },
      { name: "{anticipated_final}", description: "Anticipated final amount" },
    ],
  },
  {
    title: "Variations Loop",
    description: "Iterate through variations",
    syntax: "{#variations}...{/variations}",
    fields: [
      { name: "{code}", description: "Variation code" },
      { name: "{description}", description: "Variation description" },
      { name: "{type}", description: "Type (Credit/Extra)" },
      { name: "{amount}", description: "Variation amount" },
    ],
  },
];

export const TemplatePlaceholderReference = () => {
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlaceholder(text);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedPlaceholder(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placeholder Reference</CardTitle>
        <CardDescription>
          Available placeholders for cost report templates. Click to copy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simple Placeholders */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Simple Placeholders</h4>
          {PLACEHOLDER_GROUPS.map((group) => (
            <Collapsible key={group.title} defaultOpen>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="text-left">
                    <div className="font-medium">{group.title}</div>
                    <div className="text-xs text-muted-foreground">{group.description}</div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                {group.placeholders.map((placeholder) => (
                  <div
                    key={placeholder.name}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => copyToClipboard(placeholder.name)}
                  >
                    <div className="flex-1">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {placeholder.name}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {placeholder.description}
                      </p>
                    </div>
                    {copiedPlaceholder === placeholder.name ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Loop Syntax */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-sm">Loop Syntax (for tables)</h4>
          {LOOP_GROUPS.map((loop) => (
            <Collapsible key={loop.title} defaultOpen>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="text-left">
                    <div className="font-medium">{loop.title}</div>
                    <div className="text-xs text-muted-foreground">{loop.description}</div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <div
                  className="p-2 rounded-md bg-muted/50 cursor-pointer"
                  onClick={() => copyToClipboard(loop.syntax)}
                >
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono">{loop.syntax}</code>
                    {copiedPlaceholder === loop.syntax ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-1 pl-4">
                  {loop.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      onClick={() => copyToClipboard(field.name)}
                    >
                      <div className="flex-1">
                        <code className="font-mono bg-muted px-2 py-1 rounded">
                          {field.name}
                        </code>
                        <span className="text-xs text-muted-foreground ml-2">
                          {field.description}
                        </span>
                      </div>
                      {copiedPlaceholder === field.name ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
