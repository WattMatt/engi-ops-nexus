import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Play, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillWithPreference } from "@/hooks/useAISkills";
import { DynamicIcon } from "./DynamicIcon";

interface SkillCardProps {
  skill: SkillWithPreference;
  onToggleFavorite: (skillId: string, isFavorite: boolean) => void;
  onUseSkill: (skillId: string) => void;
  onViewDetails: (skill: SkillWithPreference) => void;
  onDelete?: (skillId: string) => void;
}

export function SkillCard({ skill, onToggleFavorite, onUseSkill, onViewDetails, onDelete }: SkillCardProps) {
  const categoryColors: Record<string, string> = {
    Technical: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Document: "bg-green-500/10 text-green-600 border-green-500/20",
    Financial: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Operations: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    Analytics: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    general: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DynamicIcon name={skill.icon} className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold leading-tight">
                {skill.name}
              </CardTitle>
              <Badge 
                variant="outline" 
                className={cn("text-xs", categoryColors[skill.category] || categoryColors.general)}
              >
                {skill.category}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(skill.id, !skill.is_favorite);
            }}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                skill.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm line-clamp-2">
          {skill.description}
        </CardDescription>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v{skill.version}</span>
          {skill.usage_count > 0 && (
            <span>Used {skill.usage_count}x</span>
          )}
          {skill.is_system && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onUseSkill(skill.id)}
          >
            <Play className="h-3 w-3 mr-1" />
            Use Skill
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(skill)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          {!skill.is_system && onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(skill.id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
