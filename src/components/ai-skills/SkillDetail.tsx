import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Copy, Check } from "lucide-react";
import { useState } from "react";
import { SkillWithPreference } from "@/hooks/useAISkills";
import { DynamicIcon } from "./DynamicIcon";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface SkillDetailProps {
  skill: SkillWithPreference;
  open: boolean;
  onClose: () => void;
  onUseSkill: (skillId: string) => void;
}

export function SkillDetail({ skill, open, onClose, onUseSkill }: SkillDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyInstructions = async () => {
    await navigator.clipboard.writeText(skill.instructions);
    setCopied(true);
    toast.success("Instructions copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DynamicIcon name={skill.icon} className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{skill.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{skill.category}</Badge>
                <span className="text-xs text-muted-foreground">v{skill.version}</span>
                {skill.is_system && (
                  <Badge variant="secondary" className="text-xs">System Skill</Badge>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="pt-2">
            {skill.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Skill Instructions</h4>
            <Button variant="ghost" size="sm" onClick={handleCopyInstructions}>
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{skill.instructions}</ReactMarkdown>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => {
            onUseSkill(skill.id);
            onClose();
          }}>
            <Play className="h-4 w-4 mr-1" />
            Use This Skill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
