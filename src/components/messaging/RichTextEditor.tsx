import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline as UnderlineIcon, Code, List, ListOrdered, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useEffect, forwardRef, useImperativeHandle } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string, html: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
}

export interface RichTextEditorRef {
  focus: () => void;
  clear: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder = "Type a message...", onSubmit, className }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        Underline,
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value,
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2",
        },
        handleKeyDown: (view, event) => {
          // Only intercept Enter for submit when onSubmit is provided (chat mode)
          // Otherwise, allow normal Enter behavior for new lines and list items
          if (onSubmit && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        const text = editor.getText();
        const html = editor.getHTML();
        onChange(text, html);
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      clear: () => editor?.commands.clearContent(),
    }));

    useEffect(() => {
      if (editor) {
        const currentContent = editor.getHTML();
        // Sync editor content with external value changes
        if (value === "" && editor.getText() !== "") {
          editor.commands.clearContent();
        } else if (value && value !== currentContent && value !== "<p></p>") {
          editor.commands.setContent(value);
        }
      }
    }, [value, editor]);

    if (!editor) return null;

    return (
      <div className={cn("border rounded-lg bg-background", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("underline")}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <div className="w-px h-4 bg-border mx-1" />
          <Toggle
            size="sm"
            pressed={editor.isActive("code")}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            aria-label="Inline code"
          >
            <Code className="h-4 w-4" />
          </Toggle>
          <div className="w-px h-4 bg-border mx-1" />
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
