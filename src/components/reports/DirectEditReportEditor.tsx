import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Monitor, Tablet, Smartphone, Save, Download, Plus, Trash2 } from "lucide-react";
import { ReportEditorToolbar } from "./editor/ReportEditorToolbar";
import { EditableA4Page } from "./editor/EditableA4Page";
import { ReportSectionManager } from "./editor/ReportSectionManager";
import { ReportSettings, useReportSettings } from "@/hooks/useReportSettings";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DirectEditReportEditorProps {
  reportData: any;
  reportType: "generator" | "cable_schedule" | "cost_report" | "specification";
  projectId: string;
  onSave?: (content: any) => void;
  onExport?: (settings: ReportSettings) => void;
}

export type ViewportSize = "desktop" | "tablet" | "mobile";

export function DirectEditReportEditor({
  reportData,
  reportType,
  projectId,
  onSave,
  onExport,
}: DirectEditReportEditorProps) {
  const { settings, saveSettings } = useReportSettings(projectId);
  const [viewportSize, setViewportSize] = useState<ViewportSize>("desktop");
  const [pages, setPages] = useState<any[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize pages from report data
    const initialPages = generateInitialPages(reportData, reportType, settings);
    setPages(initialPages);
    if (initialPages.length > 0) {
      setActivePageId(initialPages[0].id);
    }
  }, [reportData, reportType, settings]);

  const generateInitialPages = (data: any, type: string, settings: ReportSettings) => {
    const basePage = {
      id: "page-1",
      pageNumber: 1,
      sections: [] as any[],
    };

    // Cover page content
    if (settings.include_cover_page) {
      basePage.sections.push({
        id: "cover-title",
        type: "heading",
        editable: true,
        content: `<h1 style="text-align: center; margin-top: 100px; font-size: 32px; color: ${settings.primary_color}">${data.projectName || "Project Report"}</h1>`,
        style: { marginTop: "100px" },
      });
      
      if (settings.company_name) {
        basePage.sections.push({
          id: "cover-company",
          type: "text",
          editable: true,
          content: `<p style="text-align: center; margin-top: 50px; font-size: 18px;">${settings.company_name}</p>`,
          style: { marginTop: "50px" },
        });
      }

      basePage.sections.push({
        id: "cover-date",
        type: "text",
        editable: true,
        content: `<p style="text-align: center; margin-top: 20px;">${new Date().toLocaleDateString()}</p>`,
        style: { marginTop: "20px" },
      });
    }

    // Additional pages
    const pages = [basePage];

    // Page 2 - Executive Summary
    pages.push({
      id: "page-2",
      pageNumber: 2,
      sections: [
        {
          id: "summary-heading",
          type: "heading",
          editable: true,
          content: `<h2 style="color: ${settings.primary_color}">Executive Summary</h2>`,
        },
        {
          id: "summary-content",
          type: "text",
          editable: true,
          content: "<p>This report provides a comprehensive analysis of the project requirements and deliverables. Click to edit this content...</p>",
        },
      ],
    });

    // Page 3 - Details (type-specific)
    if (type === "generator") {
      pages.push({
        id: "page-3",
        pageNumber: 3,
        sections: [
          {
            id: "equipment-heading",
            type: "heading",
            editable: true,
            content: `<h2 style="color: ${settings.primary_color}">Equipment Overview</h2>`,
          },
          {
            id: "equipment-table",
            type: "table",
            editable: true,
            content: `<table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: ${settings.table_style.headerBg}; color: ${settings.table_style.headerColor};">
                  <th style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">Item</th>
                  <th style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">Description</th>
                  <th style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">Generator</td>
                  <td style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">Main Power Unit</td>
                  <td style="padding: ${settings.table_style.cellPadding}px; border: 1px solid #ddd;">1</td>
                </tr>
              </tbody>
            </table>`,
          },
        ],
      });
    }

    return pages;
  };

  const handleSectionUpdate = (pageId: string, sectionId: string, newContent: string) => {
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              sections: page.sections.map((section: any) =>
                section.id === sectionId ? { ...section, content: newContent } : section
              ),
            }
          : page
      )
    );
  };

  const handleAddPage = () => {
    const newPage = {
      id: `page-${pages.length + 1}`,
      pageNumber: pages.length + 1,
      sections: [
        {
          id: `section-${Date.now()}`,
          type: "text",
          editable: true,
          content: "<p>New page content - click to edit...</p>",
        },
      ],
    };
    setPages([...pages, newPage]);
    setActivePageId(newPage.id);
    toast.success("Page added");
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      toast.error("Cannot delete the last page");
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    toast.success("Page deleted");
  };

  const handleSaveReport = () => {
    const reportContent = {
      pages,
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

  const allSections = pages.flatMap((page) =>
    page.sections.map((section: any) => ({
      ...section,
      pageId: page.id,
      pageNumber: page.pageNumber,
    }))
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Direct Edit Report</h2>
          <span className="text-sm text-muted-foreground">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
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

      {/* Formatting Toolbar */}
      <ReportEditorToolbar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar - Page Thumbnails */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
            <div className="h-full flex flex-col border-r bg-card">
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-sm">Pages</h3>
                <Button size="sm" variant="ghost" onClick={handleAddPage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`group relative p-2 border rounded cursor-pointer transition-colors ${
                        activePageId === page.id
                          ? "border-primary bg-accent"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => setActivePageId(page.id)}
                    >
                      <div className="aspect-[210/297] bg-white rounded shadow-sm overflow-hidden text-xs">
                        <div className="p-2">Page {page.pageNumber}</div>
                      </div>
                      {pages.length > 1 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePage(page.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center - Editable A4 Pages */}
          <ResizablePanel defaultSize={85}>
            <ScrollArea className="h-full bg-muted/30">
              <div className="p-8 flex flex-col items-center gap-8">
                {pages.map((page) => (
                  <EditableA4Page
                    key={page.id}
                    page={page}
                    settings={settings}
                    viewportSize={viewportSize}
                    isActive={activePageId === page.id}
                    activeSectionId={activeSectionId}
                    onSectionUpdate={(sectionId, content) =>
                      handleSectionUpdate(page.id, sectionId, content)
                    }
                    onSectionSelect={setActiveSectionId}
                  />
                ))}
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}