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
    <div className="flex flex-col h-full">
      {/* Header - fixed */}
      <div className="p-6 pb-4 shrink-0">
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
      </div>

      {/* Tabs - grows and scrolls */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 px-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 shrink-0">
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

        <TabsContent value="overview" className="flex-1 overflow-auto mt-6 pb-6">
          <GamificationOverview />
        </TabsContent>

        <TabsContent value="hall-of-fame" className="flex-1 overflow-auto mt-6 pb-6">
          <HallOfFame />
        </TabsContent>

        <TabsContent value="prizes" className="flex-1 overflow-auto mt-6 pb-6">
          <PrizeTracking />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto mt-6 pb-6">
          <GamificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
