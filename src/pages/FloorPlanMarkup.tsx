import { FloorPlanProvider } from '@/contexts/FloorPlanContext';
import { LeftToolbar } from '@/components/floor-plan/LeftToolbar';
import { GeminiStudioEmbed } from '@/components/floor-plan/GeminiStudioEmbed';
import { RightPanel } from '@/components/floor-plan/RightPanel';
import { KeyboardShortcuts } from '@/components/floor-plan/KeyboardShortcuts';

function FloorPlanContent() {
  return (
    <div className="flex h-full bg-background">
      <KeyboardShortcuts />
      
      {/* Left Toolbar */}
      <div className="w-20 border-r border-border bg-surface flex-shrink-0">
        <LeftToolbar />
      </div>

      {/* Center Canvas - Gemini Studio Iframe */}
      <div className="flex-1 relative overflow-hidden">
        <GeminiStudioEmbed />
      </div>

      {/* Right Panel */}
      <div className="w-96 border-l border-border bg-surface flex-shrink-0 overflow-y-auto">
        <RightPanel />
      </div>
    </div>
  );
}

export default function FloorPlanMarkup() {
  return (
    <FloorPlanProvider>
      <div className="h-screen flex flex-col">
        <FloorPlanContent />
      </div>
    </FloorPlanProvider>
  );
}
