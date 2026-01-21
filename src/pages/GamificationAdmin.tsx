import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamificationOverview } from "@/components/admin/gamification/GamificationOverview";
import { HallOfFame } from "@/components/admin/gamification/HallOfFame";
import { PrizeTracking } from "@/components/admin/gamification/PrizeTracking";
import { GamificationSettings } from "@/components/admin/gamification/GamificationSettings";
import { Trophy, Crown, Gift, Settings } from "lucide-react";

export default function GamificationAdmin() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gamification & Rewards</h1>
          <p className="text-muted-foreground">
            Track progress, manage winners, and award prizes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="hall-of-fame" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Hall of Fame</span>
          </TabsTrigger>
          <TabsTrigger value="prizes" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Prizes</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <GamificationOverview />
        </TabsContent>

        <TabsContent value="hall-of-fame">
          <HallOfFame />
        </TabsContent>

        <TabsContent value="prizes" className="overflow-auto">
          <PrizeTracking />
        </TabsContent>

        <TabsContent value="settings" className="overflow-auto pb-6">
          <GamificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
