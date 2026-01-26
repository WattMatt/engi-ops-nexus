import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X, Star } from "lucide-react";
import { useAISkills, SkillWithPreference } from "@/hooks/useAISkills";
import { DynamicIcon } from "./DynamicIcon";
import { cn } from "@/lib/utils";

interface SkillSelectorProps {
  selectedSkillId: string | null;
  onSelectSkill: (skillId: string | null) => void;
  compact?: boolean;
}

export function SkillSelector({ selectedSkillId, onSelectSkill, compact = false }: SkillSelectorProps) {
  const { skills, favoriteSkills, isLoading } = useAISkills();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedSkill = skills.find((s) => s.id === selectedSkillId);

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (skill: SkillWithPreference | null) => {
    onSelectSkill(skill?.id || null);
    setOpen(false);
    setSearch("");
  };

  if (isLoading) {
    return (
      <Button variant="outline" size={compact ? "sm" : "default"} disabled>
        Loading skills...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "justify-between",
            compact ? "w-auto" : "w-full md:w-[280px]"
          )}
        >
          {selectedSkill ? (
            <div className="flex items-center gap-2 truncate">
              <DynamicIcon name={selectedSkill.icon} className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedSkill.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a skill...</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {selectedSkill && (
            <div className="p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => handleSelect(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Clear selection
              </Button>
            </div>
          )}

          {favoriteSkills.length > 0 && !search && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 pb-1">
                Favorites
              </p>
              {favoriteSkills.map((skill) => (
                <SkillOption
                  key={skill.id}
                  skill={skill}
                  isSelected={skill.id === selectedSkillId}
                  onSelect={() => handleSelect(skill)}
                />
              ))}
            </div>
          )}

          <div className="p-2">
            {!search && favoriteSkills.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground px-2 pb-1">
                All Skills
              </p>
            )}
            {filteredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No skills found
              </p>
            ) : (
              filteredSkills.map((skill) => (
                <SkillOption
                  key={skill.id}
                  skill={skill}
                  isSelected={skill.id === selectedSkillId}
                  onSelect={() => handleSelect(skill)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function SkillOption({
  skill,
  isSelected,
  onSelect,
}: {
  skill: SkillWithPreference;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-2 p-2 rounded-md text-left transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-muted"
      )}
    >
      <DynamicIcon name={skill.icon} className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">{skill.name}</span>
          {skill.is_favorite && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {skill.category}
      </Badge>
    </button>
  );
}
