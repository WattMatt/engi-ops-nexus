import { Card } from "@/components/ui/card";
import { ReportSettings } from "@/hooks/useReportSettings";
import { ViewportSize } from "../DirectEditReportEditor";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface EditableA4PageProps {
  page: any;
  settings: ReportSettings;
  viewportSize: ViewportSize;
  isActive: boolean;
  activeSectionId: string | null;
  onSectionUpdate: (sectionId: string, content: string) => void;
  onSectionSelect: (sectionId: string) => void;
}

export function EditableA4Page({
  page,
  settings,
  viewportSize,
  isActive,
  activeSectionId,
  onSectionUpdate,
  onSectionSelect,
}: EditableA4PageProps) {
  const getPageStyle = () => {
    if (settings.page_orientation === "landscape") {
      return {
        width: "1122px",
        height: "794px",
        minHeight: "794px",
      };
    }
    return {
      width: "794px",
      height: "1122px",
      minHeight: "1122px",
    };
  };

  const getScale = () => {
    switch (viewportSize) {
      case "mobile":
        return 0.3;
      case "tablet":
        return 0.5;
      default:
        return 0.65;
    }
  };

  return (
    <div
      style={{
        transform: `scale(${getScale()})`,
        transformOrigin: "top center",
      }}
    >
      <Card
        className={cn(
          "bg-white shadow-2xl overflow-hidden transition-all",
          isActive && "ring-2 ring-primary"
        )}
        style={getPageStyle()}
      >
        <div
          style={{
            padding: `${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm`,
            fontFamily: settings.font_family,
            fontSize: `${settings.font_size}pt`,
            lineHeight: settings.line_spacing,
            height: "100%",
            position: "relative",
          }}
        >
          {/* Company Logo */}
          {page.pageNumber === 1 && settings.company_logo_url && (
            <div className="mb-6 flex justify-center">
              <img
                src={settings.company_logo_url}
                alt="Company Logo"
                className="h-20 object-contain"
              />
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

          {/* Editable Sections */}
          <div className="space-y-4 relative z-10">
            {page.sections.map((section: any) => (
              <EditableSection
                key={section.id}
                section={section}
                settings={settings}
                isActive={activeSectionId === section.id}
                onUpdate={(content) => onSectionUpdate(section.id, content)}
                onSelect={() => onSectionSelect(section.id)}
              />
            ))}
          </div>

          {/* Page Number */}
          {settings.show_page_numbers && (
            <div
              className="absolute bottom-4 left-0 right-0 text-center"
              style={{
                fontSize: `${settings.footer_style.fontSize}pt`,
                color: settings.footer_style.color,
              }}
            >
              Page {page.pageNumber}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function EditableSection({
  section,
  settings,
  isActive,
  onUpdate,
  onSelect,
}: {
  section: any;
  settings: ReportSettings;
  isActive: boolean;
  onUpdate: (content: string) => void;
  onSelect: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
    ],
    content: section.content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    onFocus: () => {
      setIsFocused(true);
      onSelect();
    },
    onBlur: () => {
      setIsFocused(false);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[40px]",
          "transition-all rounded",
          (isFocused || isActive) && "ring-2 ring-primary/50 bg-primary/5 p-2"
        ),
      },
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "cursor-text transition-all",
        section.style?.marginTop && `mt-[${section.style.marginTop}]`
      )}
      onClick={() => {
        editor.commands.focus();
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}