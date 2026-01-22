import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, XCircle, Bold, Italic, List, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Toggle } from "@/components/ui/toggle";

interface BudgetExclusionsProps {
  budgetId: string;
  initialValue: string | null;
  onUpdate: () => void;
}

export const BudgetExclusions = ({ budgetId, initialValue, onUpdate }: BudgetExclusionsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `List items explicitly excluded from this budget estimate:

• Structural works and building modifications
• HVAC electrical connections (by mechanical contractor)
• IT infrastructure and data cabling
• Specialized medical equipment connections
• Temporary power during construction`,
      }),
    ],
    content: initialValue || "",
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      setHasChanges(newContent !== (initialValue || ""));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[250px] p-4 focus:outline-none",
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
        .update({ exclusions: content === "<p></p>" ? null : content })
        .eq("id", budgetId);

      if (error) throw error;

      toast.success("Exclusions saved successfully");
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving exclusions:", error);
      toast.error("Failed to save exclusions");
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Budget Exclusions</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Document items that are explicitly <strong>not included</strong> in this budget estimate. 
          These exclusions will appear at the end of the budget report.
        </p>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b pb-2">
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
          <div className="w-px h-6 bg-border mx-1" />
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
        </div>
        
        {/* Editor */}
        <div className="border rounded-md bg-background">
          <EditorContent editor={editor} />
        </div>

        {editor.getText().trim() && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>This section will be displayed prominently at the end of the budget report.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
