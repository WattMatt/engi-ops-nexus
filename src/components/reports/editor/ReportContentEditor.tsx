import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { ReportSettings } from "@/hooks/useReportSettings";
import { useEffect } from "react";

interface ReportContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  settings: ReportSettings;
}

export function ReportContentEditor({ content, onChange, settings }: ReportContentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4",
        style: `font-family: ${settings.font_family}; font-size: ${settings.font_size}pt; line-height: ${settings.line_spacing};`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border min-h-[500px]">
      <EditorContent editor={editor} />
    </div>
  );
}