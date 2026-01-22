import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Save, 
  Info,
  Bold, 
  Italic, 
  Underline,
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Minus,
  Quote,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetBaselineAllowancesProps {
  budgetId: string;
  initialValue?: string | null;
  onUpdate?: () => void;
}

export const BudgetBaselineAllowances = ({ 
  budgetId, 
  initialValue,
  onUpdate 
}: BudgetBaselineAllowancesProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: `Enter baseline allowances and assumptions...

• Lighting: 12 W/m² allowance for general areas
• Small Power: 25 W/m² for office spaces
• HVAC Electrical: Based on 150 W/m² cooling load
• Future Expansion: 15% spare capacity included
• Cable Lengths: Based on preliminary layout drawings
• Distribution: One DB per 500m² floor area assumed`,
      }),
    ],
    content: initialValue || "",
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setHasChanges(newContent !== (initialValue || ""));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] p-6 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && initialValue !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== initialValue) {
        editor.commands.setContent(initialValue || "");
        setHasChanges(false);
      }
    }
  }, [initialValue, editor]);

  const handleSave = async () => {
    if (!editor) return;
    
    setIsSaving(true);
    try {
      const content = editor.getHTML();
      const { error } = await supabase
        .from("electrical_budgets")
        .update({ baseline_allowances: content === "<p></p>" ? null : content })
        .eq("id", budgetId);

      if (error) throw error;

      toast.success("Baseline allowances saved successfully");
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error saving baseline allowances:", error);
      toast.error("Failed to save baseline allowances");
    } finally {
      setIsSaving(false);
    }
  };

  const handleHeadingChange = (value: string) => {
    if (!editor) return;
    
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (value === "heading1") {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (value === "heading2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (value === "heading3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  const getCurrentHeading = () => {
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "heading1";
    if (editor.isActive("heading", { level: 2 })) return "heading2";
    if (editor.isActive("heading", { level: 3 })) return "heading3";
    return "paragraph";
  };

  const hasContent = editor?.getText().trim().length > 0;

  if (!editor) return null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Baseline Allowances</CardTitle>
            {hasContent && (
              <Badge variant="secondary" className="ml-2">
                Populated
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Unsaved changes
              </span>
            )}
            <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <CardDescription>
          Define the baseline allowances and assumptions used for this budget estimate.
          This information will be included in the budget report.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-hidden">
        {/* Word Processor Container */}
        <div className="flex-1 flex flex-col border rounded-lg bg-muted/30 overflow-hidden">
          {/* Toolbar */}
          <div className="bg-background border-b px-2 py-1.5 flex flex-wrap items-center gap-0.5 shrink-0">
            {/* Undo/Redo */}
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label="Undo"
              className="h-8 w-8 p-0"
            >
              <Undo className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label="Redo"
              className="h-8 w-8 p-0"
            >
              <Redo className="h-4 w-4" />
            </Toggle>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Heading Selector */}
            <Select value={getCurrentHeading()} onValueChange={handleHeadingChange}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Paragraph" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="heading1">Heading 1</SelectItem>
                <SelectItem value="heading2">Heading 2</SelectItem>
                <SelectItem value="heading3">Heading 3</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Text Formatting */}
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold"
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic"
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("underline")}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Underline"
              className="h-8 w-8 p-0"
            >
              <Underline className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("strike")}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              aria-label="Strikethrough"
              className="h-8 w-8 p-0 line-through"
            >
              S
            </Toggle>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Alignment */}
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'left' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
              aria-label="Align Left"
              className="h-8 w-8 p-0"
            >
              <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'center' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
              aria-label="Align Center"
              className="h-8 w-8 p-0"
            >
              <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'right' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
              aria-label="Align Right"
              className="h-8 w-8 p-0"
            >
              <AlignRight className="h-4 w-4" />
            </Toggle>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Lists */}
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet List"
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Numbered List"
              className="h-8 w-8 p-0"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Block Elements */}
            <Toggle
              size="sm"
              pressed={editor.isActive("blockquote")}
              onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label="Quote"
              className="h-8 w-8 p-0"
            >
              <Quote className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
              aria-label="Horizontal Rule"
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Toggle>
          </div>

          {/* Document Area - styled like a word processor */}
          <div className="flex-1 overflow-auto bg-muted/50 p-4 flex justify-center">
            <div className="w-full max-w-[800px] bg-background shadow-lg rounded border min-h-full">
              <EditorContent 
                editor={editor} 
                className="[&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:p-8 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:mb-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:mb-3 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-muted-foreground/30 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-border"
              />
            </div>
          </div>

          {/* Status Bar */}
          <div className="bg-background border-t px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>
              {editor.getText().length} characters
            </span>
            <span>
              {hasChanges ? "Modified" : "Saved"}
            </span>
          </div>
        </div>

        {hasContent && (
          <div className="rounded-md bg-primary/10 border border-primary/20 p-3 shrink-0">
            <p className="text-sm text-primary flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span><strong>Report Ready:</strong> These baseline allowances will be included in the budget report when exported.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
