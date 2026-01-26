import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAISkills } from "@/hooks/useAISkills";
import { DynamicIcon } from "./DynamicIcon";

const iconOptions = [
  { value: "sparkles", label: "Sparkles" },
  { value: "zap", label: "Lightning" },
  { value: "brain", label: "Brain" },
  { value: "code", label: "Code" },
  { value: "file-text", label: "Document" },
  { value: "calculator", label: "Calculator" },
  { value: "shield-check", label: "Shield" },
  { value: "lightbulb", label: "Lightbulb" },
  { value: "wrench", label: "Wrench" },
  { value: "settings", label: "Settings" },
];

const categoryOptions = [
  "Technical",
  "Document",
  "Financial",
  "Operations",
  "Analytics",
  "Custom",
];

interface SkillCreatorProps {
  open: boolean;
  onClose: () => void;
}

export function SkillCreator({ open, onClose }: SkillCreatorProps) {
  const { createSkill } = useAISkills();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Custom",
    icon: "sparkles",
    instructions: "",
    version: "1.0.0",
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.instructions) {
      return;
    }

    await createSkill.mutateAsync(formData);
    setFormData({
      name: "",
      description: "",
      category: "Custom",
      icon: "sparkles",
      instructions: "",
      version: "1.0.0",
      is_active: true,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Skill</DialogTitle>
          <DialogDescription>
            Create a new AI skill with custom instructions to enhance the assistant's capabilities.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Skill Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Technical Writer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <DynamicIcon name={formData.icon} className="h-4 w-4" />
                      <span className="capitalize">{formData.icon.replace("-", " ")}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={icon.value} className="h-4 w-4" />
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this skill does (shown on skill cards)"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Skill Instructions (Markdown) *</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder={`# Skill Name

## Purpose
Describe what this skill helps with...

## Key Capabilities
1. First capability
2. Second capability

## Response Format
How the AI should structure responses...

## Best Practices
- Guideline 1
- Guideline 2`}
              rows={12}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use Markdown formatting. These instructions will be injected into the AI system prompt when the skill is active.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSkill.isPending}>
              {createSkill.isPending ? "Creating..." : "Create Skill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
