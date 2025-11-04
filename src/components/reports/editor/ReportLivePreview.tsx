import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportSettings } from "@/hooks/useReportSettings";
import { ViewportSize } from "../InteractiveReportEditor";
import { cn } from "@/lib/utils";

interface ReportLivePreviewProps {
  sections: any[];
  settings: ReportSettings;
  viewportSize: ViewportSize;
}

export function ReportLivePreview({ sections, settings, viewportSize }: ReportLivePreviewProps) {
  const getViewportWidth = () => {
    switch (viewportSize) {
      case "mobile":
        return "w-[375px]";
      case "tablet":
        return "w-[768px]";
      default:
        return "w-full";
    }
  };

  const getPageDimensions = () => {
    if (settings.page_orientation === "landscape") {
      return "w-[297mm] h-[210mm]"; // A4 landscape
    }
    return "w-[210mm] h-[297mm]"; // A4 portrait
  };

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <div className="border-b bg-card px-4 py-2">
        <h3 className="font-medium text-sm">Live Preview</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 flex justify-center">
          <div className={cn("mx-auto transition-all", getViewportWidth())}>
            {/* PDF Page Preview */}
            <Card
              className={cn(
                "bg-white shadow-2xl mx-auto overflow-hidden",
                getPageDimensions()
              )}
              style={{
                transform: viewportSize === "desktop" ? "scale(0.7)" : "scale(0.5)",
                transformOrigin: "top center",
              }}
            >
              <div
                style={{
                  padding: `${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm`,
                  fontFamily: settings.font_family,
                  fontSize: `${settings.font_size}pt`,
                  lineHeight: settings.line_spacing,
                  color: settings.primary_color,
                }}
              >
                {/* Company Logo */}
                {settings.company_logo_url && (
                  <div className="mb-6 flex justify-center">
                    <img
                      src={settings.company_logo_url}
                      alt="Company Logo"
                      className="h-16 object-contain"
                    />
                  </div>
                )}

                {/* Company Name & Tagline */}
                {settings.company_name && (
                  <div className="text-center mb-4">
                    <h1
                      className="font-bold text-2xl"
                      style={{ color: settings.primary_color }}
                    >
                      {settings.company_name}
                    </h1>
                    {settings.company_tagline && (
                      <p className="text-sm text-muted-foreground">
                        {settings.company_tagline}
                      </p>
                    )}
                  </div>
                )}

                {/* Watermark */}
                {settings.watermark_text && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: "rotate(-45deg)",
                      opacity: settings.watermark_opacity,
                    }}
                  >
                    <span className="text-6xl font-bold text-gray-300">
                      {settings.watermark_text}
                    </span>
                  </div>
                )}

                {/* Sections Content */}
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="mb-6"
                    style={{
                      marginBottom: `${settings.paragraph_spacing}mm`,
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: section.content }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                ))}

                {/* Page Numbers */}
                {settings.show_page_numbers && (
                  <div
                    className="absolute bottom-0 left-0 right-0 text-center pb-4"
                    style={{
                      fontSize: `${settings.footer_style.fontSize}pt`,
                      color: settings.footer_style.color,
                    }}
                  >
                    Page 1
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}