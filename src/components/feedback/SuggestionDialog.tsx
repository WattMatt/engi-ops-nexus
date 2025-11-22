import { useState, useRef, useEffect } from "react";
import { Loader2, Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshot: string | null;
}

interface Attachment {
  file?: File;
  preview: string;
  name: string;
  type: string;
  url?: string;
}

// Validation schema
const attachmentSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 20 * 1024 * 1024, "File must be less than 20MB")
    .refine(
      (file) => ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'text/plain', 'application/pdf'].includes(file.type),
      "File must be an image, text file, or PDF"
    ),
});

export function SuggestionDialog({ open, onOpenChange, screenshot }: SuggestionDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [priority, setPriority] = useState("medium");
  const [additionalContext, setAdditionalContext] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add screenshot to attachments when dialog opens
  useEffect(() => {
    if (open && screenshot && !attachments.some(a => a.preview === screenshot)) {
      setAttachments(prev => [{
        preview: screenshot,
        name: `screenshot-${Date.now()}.png`,
        type: 'image/png'
      }, ...prev]);
    }
  }, [open, screenshot]);

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];
    
    for (const file of Array.from(files)) {
      try {
        attachmentSchema.parse({ file });
        
        const preview = file.type.startsWith('image/') 
          ? URL.createObjectURL(file)
          : '';
        
        newAttachments.push({
          file,
          preview,
          name: file.name,
          type: file.type
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`${file.name}: ${error.errors[0].message}`);
        }
      }
    }
    
    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Handle clipboard paste
  useEffect(() => {
    if (!open) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            try {
              attachmentSchema.parse({ file });
              const preview = URL.createObjectURL(file);
              setAttachments(prev => [...prev, {
                file,
                preview,
                name: `pasted-image-${Date.now()}.png`,
                type: file.type
              }]);
              toast.success("Image pasted successfully!");
            } catch (error) {
              if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message);
              }
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open]);

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      const removed = newAttachments.splice(index, 1)[0];
      if (removed.preview && removed.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview);
      }
      return newAttachments;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please provide both a title and description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to submit a suggestion");
        setIsSubmitting(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Upload screenshot if available
      let screenshotUrl = null;
      if (screenshot) {
        const blob = await (await fetch(screenshot)).blob();
        const fileName = `${user.id}/${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('suggestion-screenshots')
          .upload(fileName, blob, {
            contentType: 'image/png',
          });

        if (uploadError) {
          console.error('Screenshot upload failed:', uploadError);
          toast.error('Failed to upload screenshot, but continuing with submission');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('suggestion-screenshots')
            .getPublicUrl(uploadData.path);
          screenshotUrl = publicUrl;
        }
      }

      // Upload all attachments
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        if (attachment.url) {
          uploadedAttachments.push({
            url: attachment.url,
            filename: attachment.name,
            type: attachment.type
          });
          continue;
        }

        if (attachment.file) {
          const fileName = `${user.id}/${Date.now()}-${attachment.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('suggestion-screenshots')
            .upload(fileName, attachment.file, {
              contentType: attachment.type,
            });

          if (uploadError) {
            console.error('Attachment upload failed:', uploadError);
            toast.error(`Failed to upload ${attachment.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('suggestion-screenshots')
            .getPublicUrl(uploadData.path);
          
          uploadedAttachments.push({
            url: publicUrl,
            filename: attachment.name,
            type: attachment.type
          });
        } else if (attachment.preview && !attachment.preview.startsWith('blob:')) {
          const blob = await (await fetch(attachment.preview)).blob();
          const fileName = `${user.id}/${Date.now()}-${attachment.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('suggestion-screenshots')
            .upload(fileName, blob, {
              contentType: 'image/png',
            });

          if (uploadError) {
            console.error('Screenshot upload failed:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('suggestion-screenshots')
            .getPublicUrl(uploadData.path);
          
          uploadedAttachments.push({
            url: publicUrl,
            filename: attachment.name,
            type: 'image/png'
          });
        }
      }

      // Collect browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
      };

      // Keep old screenshot_url for backwards compatibility
      const legacyScreenshotUrl = uploadedAttachments.find(a => a.type.startsWith('image/'))?.url || screenshotUrl;

      // Insert suggestion
      const { data: newSuggestion, error: insertError } = await supabase
        .from('suggestions')
        .insert({
          reported_by: user.id,
          user_email: profile?.email || user.email || '',
          user_name: profile?.full_name || '',
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          screenshot_url: legacyScreenshotUrl,
          attachments: uploadedAttachments,
          additional_context: additionalContext.trim() || null,
          page_url: window.location.href,
          browser_info: browserInfo,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Notify admin via email
      try {
        await supabase.functions.invoke('notify-admin-feedback', {
          body: {
            feedbackId: newSuggestion.id,
            type: 'suggestion',
            title: title.trim(),
            description: description.trim(),
            submittedBy: profile?.full_name || 'Unknown User',
            userEmail: profile?.email || user.email || '',
            priority: priority,
            category: category,
          },
        });
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
        // Don't fail the whole submission if email fails
      }

      toast.success("Suggestion submitted successfully! Thank you for your feedback.");
      
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("feature");
      setPriority("medium");
      setAdditionalContext("");
      setAttachments([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      toast.error("Failed to submit suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit a Suggestion</DialogTitle>
          <DialogDescription>
            Share your ideas for new features and improvements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {screenshot && (
            <div className="space-y-2">
              <Label>Screenshot</Label>
              <div className="rounded-lg border overflow-hidden">
                <img 
                  src={screenshot} 
                  alt="Screenshot" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachments ({attachments.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Attachments Grid */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg border">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative group">
                    {attachment.type.startsWith('image/') ? (
                      <div className="aspect-video rounded-md overflow-hidden border">
                        <img 
                          src={attachment.preview} 
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-md border bg-card flex flex-col items-center justify-center p-2">
                        <FileIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs text-center truncate w-full px-2">{attachment.name}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              💡 Tip: You can paste images directly with Ctrl+V
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Brief summary of your suggestion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please describe your suggestion in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="additionalContext">Additional Context / Use Cases</Label>
            <Textarea
              id="additionalContext"
              placeholder="Any additional information that might help (examples, use cases, benefits, etc.)..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">New Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="ui-ux">UI/UX</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Suggestion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
