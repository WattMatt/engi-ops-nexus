import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Monitor, Tablet, Smartphone, Save, Download, Settings, Eye } from "lucide-react";
import { ReportEditorToolbar } from "./editor/ReportEditorToolbar";
import { ReportContentEditor } from "./editor/ReportContentEditor";
import { ReportLivePreview } from "./editor/ReportLivePreview";
import { ReportSectionManager } from "./editor/ReportSectionManager";
import { ReportSettings, useReportSettings } from "@/hooks/useReportSettings";
import { toast } from "sonner";

interface InteractiveReportEditorProps {
  reportData: any;
  reportType: "generator" | "cable_schedule" | "cost_report" | "specification";
  projectId: string;
  onSave?: (content: any) => void;
  onExport?: (settings: ReportSettings) => void;
}

export type ViewportSize = "desktop" | "tablet" | "mobile";

export function InteractiveReportEditor({
  reportData,
  reportType,
  projectId,
  onSave,
  onExport,
}: InteractiveReportEditorProps) {
  const { settings, saveSettings } = useReportSettings(projectId);
  const [viewportSize, setViewportSize] = useState<ViewportSize>("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    // Initialize sections from report data
    const initialSections = generateInitialSections(reportData, reportType);
    setSections(initialSections);
    if (initialSections.length > 0) {
      setActiveSection(initialSections[0].id);
    }
  }, [reportData, reportType]);

  const generateInitialSections = (data: any, type: string) => {
    // Generate sections based on report type
    const baseSections = [
      {
        id: "cover",
        title: "Cover Page",
        type: "cover",
        editable: true,
        content: `<h1>${data.projectName || "Project Report"}</h1>`,
      },
      {
        id: "summary",
        title: "Executive Summary",
        type: "text",
        editable: true,
        content: "<h2>Executive Summary</h2><p>Report summary goes here...</p>",
      },
    ];

    // Add type-specific sections
    if (type === "generator") {
      baseSections.push(
        {
          id: "equipment",
          title: "Equipment Overview",
          type: "table",
          editable: true,
          content: "<h2>Equipment Details</h2>",
        },
        {
          id: "financial",
          title: "Financial Analysis",
          type: "table",
          editable: true,
          content: "<h2>Cost Analysis</h2>",
        }
      );
    }

    return baseSections;
  };

  const handleSectionReorder = (reorderedSections: any[]) => {
    setSections(reorderedSections);
    toast.success("Sections reordered");
  };

  const handleSectionUpdate = (sectionId: string, newContent: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, content: newContent } : s))
    );
  };

  const handleAddSection = (type: "text" | "table" | "image" | "chart") => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: `New ${type} Section`,
      type,
      editable: true,
      content: `<h2>New Section</h2><p>Content goes here...</p>`,
    };
    setSections([...sections, newSection]);
    setActiveSection(newSection.id);
    toast.success("Section added");
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (activeSection === sectionId) {
      setActiveSection(sections[0]?.id || null);
    }
    toast.success("Section deleted");
  };

  const handleSaveReport = () => {
    const reportContent = {
      sections,
      settings,
      metadata: {
        lastModified: new Date().toISOString(),
        reportType,
        projectId,
      },
    };
    onSave?.(reportContent);
    toast.success("Report saved successfully");
  };

  const handleExportPDF = () => {
    onExport?.(settings);
  };

  const activeContent = sections.find((s) => s.id === activeSection);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Interactive Report Editor</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewportSize === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewportSize("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewportSize === "tablet" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewportSize("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={viewportSize === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewportSize("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview Toggle */}
          <Button
            variant={showPreview ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          {/* Action Buttons */}
          <Button variant="outline" size="sm" onClick={handleSaveReport}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar - Section Manager */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <ReportSectionManager
              sections={sections}
              activeSection={activeSection}
              onSectionSelect={setActiveSection}
              onSectionReorder={handleSectionReorder}
              onAddSection={handleAddSection}
              onDeleteSection={handleDeleteSection}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center - Editor */}
          <ResizablePanel defaultSize={showPreview ? 40 : 80} minSize={30}>
            <div className="h-full flex flex-col">
              <ReportEditorToolbar />
              <div className="flex-1 overflow-auto p-6">
                {activeContent && (
                  <ReportContentEditor
                    content={activeContent.content}
                    onChange={(newContent) =>
                      handleSectionUpdate(activeContent.id, newContent)
                    }
                    settings={settings}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>

          {/* Right Sidebar - Live Preview */}
          {showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={30}>
                <ReportLivePreview
                  sections={sections}
                  settings={settings}
                  viewportSize={viewportSize}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}