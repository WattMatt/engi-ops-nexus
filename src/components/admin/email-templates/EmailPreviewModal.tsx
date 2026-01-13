import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Smartphone, Send } from "lucide-react";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  subject: string;
  variables: { name: string; description: string; example: string }[];
}

export function EmailPreviewModal({ open, onOpenChange, html, subject, variables }: EmailPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    variables.forEach((v) => {
      initial[v.name] = v.example;
    });
    return initial;
  });

  // Replace variables in content
  const processedHtml = html.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variableValues[varName] || match;
  });

  const processedSubject = subject.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variableValues[varName] || match;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Variables Panel */}
          <div className="w-64 border-r pr-4 flex flex-col">
            <h3 className="text-sm font-medium mb-3">Test Variables</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-2">
                {variables.map((variable) => (
                  <div key={variable.name} className="space-y-1">
                    <Label className="text-xs">{`{{${variable.name}}}`}</Label>
                    <Input
                      value={variableValues[variable.name] || ""}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [variable.name]: e.target.value,
                        }))
                      }
                      placeholder={variable.example}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("desktop")}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </Button>
                <Button
                  variant={viewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("mobile")}
                  className="gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </Button>
              </div>

              <Button variant="outline" size="sm" className="gap-2">
                <Send className="h-4 w-4" />
                Send Test Email
              </Button>
            </div>

            {/* Subject Preview */}
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{processedSubject || "No subject"}</p>
            </div>

            {/* Email Preview */}
            <div
              className={`flex-1 border rounded-lg overflow-hidden bg-muted/30 ${
                viewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
              }`}
            >
              <iframe
                srcDoc={processedHtml}
                title="Email Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
