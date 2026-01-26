import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSkillById } from "@/hooks/useAISkills";
import { DynamicIcon } from "./DynamicIcon";

interface ActiveSkillBadgeProps {
  skillId: string;
  onClear: () => void;
}

export function ActiveSkillBadge({ skillId, onClear }: ActiveSkillBadgeProps) {
  const { data: skill, isLoading } = useSkillById(skillId);

  if (isLoading || !skill) return null;

  return (
    <Badge 
      variant="secondary" 
      className="gap-1.5 py-1 px-2 pr-1"
    >
      <DynamicIcon name={skill.icon} className="h-3 w-3" />
      <span className="text-xs font-medium">{skill.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 ml-1 hover:bg-destructive/20"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}
