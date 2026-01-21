import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, Zap, Cpu, Server, Lightbulb, Camera, Shield, 
  ClipboardCheck, FileCheck, Award, BookOpen, BadgeCheck, BarChart3 
} from "lucide-react";

export const DOCUMENT_TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'as_built', label: 'As Built', icon: Package },
  { key: 'generators', label: 'Generators', icon: Zap },
  { key: 'transformers', label: 'Transformers', icon: Cpu },
  { key: 'main_boards', label: 'Main Boards', icon: Server },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb },
  { key: 'cctv_access_control', label: 'CCTV & Access Control', icon: Camera },
  { key: 'lightning_protection', label: 'Lightning Protection', icon: Shield },
  { key: 'specifications', label: 'Specifications', icon: ClipboardCheck },
  { key: 'test_certificates', label: 'Test Certificates', icon: FileCheck },
  { key: 'warranties', label: 'Warranties', icon: Award },
  { key: 'manuals', label: 'Manuals', icon: BookOpen },
  { key: 'commissioning_docs', label: 'Commissioning', icon: BadgeCheck },
  { key: 'compliance_certs', label: 'Compliance', icon: FileCheck },
] as const;

export type DocumentTabKey = typeof DOCUMENT_TABS[number]['key'];

interface DocumentTabSelectorProps {
  selectedTabs: string[];
  onTabsChange: (tabs: string[]) => void;
}

export function DocumentTabSelector({ selectedTabs, onTabsChange }: DocumentTabSelectorProps) {
  const handleToggle = (tabKey: string, checked: boolean) => {
    if (checked) {
      onTabsChange([...selectedTabs, tabKey]);
    } else {
      onTabsChange(selectedTabs.filter(t => t !== tabKey));
    }
  };

  const handleSelectAll = () => {
    onTabsChange(DOCUMENT_TABS.map(t => t.key));
  };

  const handleSelectNone = () => {
    // Always keep overview
    onTabsChange(['overview']);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Document Tabs Access</Label>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline"
          >
            Select All
          </button>
          <span className="text-muted-foreground">|</span>
          <button 
            type="button"
            onClick={handleSelectNone}
            className="text-xs text-primary hover:underline"
          >
            Overview Only
          </button>
        </div>
      </div>
      
      <ScrollArea className="h-48 rounded-md border p-3">
        <div className="grid grid-cols-2 gap-2">
          {DOCUMENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isChecked = selectedTabs.includes(tab.key);
            const isOverview = tab.key === 'overview';
            
            return (
              <label
                key={tab.key}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                  isChecked ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted'
                } ${isOverview ? 'opacity-75' : ''}`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggle(tab.key, checked === true)}
                  disabled={isOverview} // Overview always enabled
                />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm truncate">{tab.label}</span>
              </label>
            );
          })}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground">
        Selected: {selectedTabs.length} of {DOCUMENT_TABS.length} tabs
      </p>
    </div>
  );
}

