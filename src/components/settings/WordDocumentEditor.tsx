import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, X, Bold, Italic, List, ListOrdered } from "lucide-react";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { supabase } from "@/integrations/supabase/client";

interface WordDocumentEditorProps {
  template: any;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const WordDocumentEditor = ({ template, open, onClose, onSave }: WordDocumentEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  useEffect(() => {
    if (open && template) {
      loadDocument();
    }
  }, [open, template]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const response = await fetch(template.publicUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      const result = await mammoth.convertToHtml({ arrayBuffer });
      editor?.commands.setContent(result.value);
      
      if (result.messages.length > 0) {
        console.warn("Conversion warnings:", result.messages);
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    
    setSaving(true);
    try {
      const html = editor.getHTML();
      
      // Convert HTML to plain text and create a simple docx
      const text = editor.getText();
      const paragraphs = text.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line)],
        })
      );

      const doc = new Document({
        sections: [{
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      
      // Upload to storage
      const fileExt = template.file_name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("document_templates")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("document_templates")
        .getPublicUrl(filePath);

      // Delete old file
      const oldFilePath = template.file_url.split("/document_templates/")[1];
      if (oldFilePath) {
        await supabase.storage.from("document_templates").remove([oldFilePath]);
      }

      // Update database
      const { error: dbError } = await supabase
        .from("document_templates")
        .update({ file_url: publicUrl })
        .eq("id", template.id);

      if (dbError) throw dbError;

      toast.success("Document saved successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit {template?.name}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor?.can().chain().focus().toggleBold().run()}
                className={editor?.isActive("bold") ? "bg-accent" : ""}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor?.can().chain().focus().toggleItalic().run()}
                className={editor?.isActive("italic") ? "bg-accent" : ""}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={editor?.isActive("bulletList") ? "bg-accent" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={editor?.isActive("orderedList") ? "bg-accent" : ""}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-lg bg-background">
              <EditorContent editor={editor} />
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Note:</strong> This editor has limited formatting support. Complex formatting may be lost. 
              Keep placeholders in format: {`{{placeholder_name}}`}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};