import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Star, Loader2 } from "lucide-react";
import { useAISkills, SkillWithPreference } from "@/hooks/useAISkills";
import { SkillCard } from "./SkillCard";
import { SkillDetail } from "./SkillDetail";
import { SkillCreator } from "./SkillCreator";
import { useNavigate } from "react-router-dom";

export function SkillsLibrary() {
  const navigate = useNavigate();
  const { skills, favoriteSkills, categories, isLoading, toggleFavorite, trackUsage, deleteSkill } = useAISkills();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<SkillWithPreference | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || skill.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || skill.is_favorite;
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const handleUseSkill = (skillId: string) => {
    trackUsage.mutate(skillId);
    navigate(`/dashboard/ai-tools?skill=${skillId}`);
  };

  const handleToggleFavorite = (skillId: string, isFavorite: boolean) => {
    toggleFavorite.mutate({ skillId, isFavorite });
  };

  const handleDeleteSkill = (skillId: string) => {
    if (confirm("Are you sure you want to delete this skill?")) {
      deleteSkill.mutate(skillId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className="h-4 w-4 mr-1" />
            Favorites ({favoriteSkills.length})
          </Button>
          <Button onClick={() => setShowCreator(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Skill
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All Skills</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No skills found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggleFavorite={handleToggleFavorite}
              onUseSkill={handleUseSkill}
              onViewDetails={setSelectedSkill}
              onDelete={skill.is_system ? undefined : handleDeleteSkill}
            />
          ))}
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          open={!!selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onUseSkill={handleUseSkill}
        />
      )}

      {/* Skill Creator Modal */}
      <SkillCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
      />
    </div>
  );
}
