import { SkillsLibrary } from "@/components/ai-skills/SkillsLibrary";
import { Brain } from "lucide-react";

export default function AISkills() {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Skills Library</h1>
          <p className="text-muted-foreground">
            Browse, create, and manage AI skills to enhance your assistant's capabilities
          </p>
        </div>
      </div>

      {/* Skills Library */}
      <SkillsLibrary />
    </div>
  );
}
