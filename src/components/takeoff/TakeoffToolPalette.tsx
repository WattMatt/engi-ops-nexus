import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  MousePointer, Ruler, Hash, PenTool, Square,
  ToggleLeft, ToggleRight, Plug, Network, Lightbulb,
  Search, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TakeoffTool, TakeoffCatalogItem, TakeoffAssembly } from './types';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  'toggle-left': <ToggleLeft className="h-4 w-4" />,
  'toggle-right': <ToggleRight className="h-4 w-4" />,
  'plug': <Plug className="h-4 w-4" />,
  'network': <Network className="h-4 w-4" />,
  'lightbulb': <Lightbulb className="h-4 w-4" />,
};

interface Props {
  activeTool: TakeoffTool;
  onToolChange: (tool: TakeoffTool) => void;
  catalog: TakeoffCatalogItem[];
  assemblies: TakeoffAssembly[];
  selectedCatalogId: string | null;
  selectedAssemblyId: string | null;
  onSelectCatalog: (id: string | null) => void;
  onSelectAssembly: (id: string | null) => void;
}

export function TakeoffToolPalette({
  activeTool, onToolChange, catalog, assemblies,
  selectedCatalogId, selectedAssemblyId, onSelectCatalog, onSelectAssembly,
}: Props) {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ Devices: true, Fixtures: true });

  const grouped = catalog.reduce<Record<string, TakeoffCatalogItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const filtered = search
    ? catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const toggleCategory = (cat: string) =>
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="flex flex-col h-full">
      {/* Drawing tools */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</p>
        <div className="grid grid-cols-5 gap-1">
          {([
            { tool: 'select' as TakeoffTool, icon: <MousePointer className="h-4 w-4" />, label: 'Select' },
            { tool: 'scale' as TakeoffTool, icon: <Ruler className="h-4 w-4" />, label: 'Scale' },
            { tool: 'count' as TakeoffTool, icon: <Hash className="h-4 w-4" />, label: 'Count' },
            { tool: 'linear' as TakeoffTool, icon: <PenTool className="h-4 w-4" />, label: 'Linear' },
            { tool: 'zone' as TakeoffTool, icon: <Square className="h-4 w-4" />, label: 'Zone' },
          ]).map(({ tool, icon, label }) => (
            <Button
              key={tool}
              size="sm"
              variant={activeTool === tool ? 'default' : 'outline'}
              className="flex flex-col h-14 gap-1 text-[10px]"
              onClick={() => onToolChange(tool)}
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Assemblies quick-pick */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assemblies</p>
        <div className="flex flex-wrap gap-1">
          {assemblies.map(a => (
            <Button
              key={a.id}
              size="sm"
              variant={selectedAssemblyId === a.id ? 'default' : 'outline'}
              className="gap-1 text-xs h-8"
              style={selectedAssemblyId === a.id ? { backgroundColor: a.color } : {}}
              onClick={() => {
                onSelectAssembly(selectedAssemblyId === a.id ? null : a.id);
                onSelectCatalog(null);
                if (activeTool !== 'count') onToolChange('count');
              }}
            >
              {TOOL_ICONS[a.icon_svg || ''] || <Hash className="h-3 w-3" />}
              <span className="truncate max-w-[80px]">{a.name.replace(' Assembly', '')}</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Catalog browser */}
      <div className="p-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search catalog..."
            className="pl-8 h-9 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        {filtered ? (
          <div className="space-y-1 py-2">
            {filtered.map(item => (
              <CatalogButton
                key={item.id}
                item={item}
                selected={selectedCatalogId === item.id}
                onSelect={() => {
                  onSelectCatalog(selectedCatalogId === item.id ? null : item.id);
                  onSelectAssembly(null);
                  const isLinear = ['Conduit', 'Containment', 'Cable'].includes(item.category);
                  if (isLinear && activeTool !== 'linear') onToolChange('linear');
                  else if (!isLinear && activeTool !== 'count') onToolChange('count');
                }}
              />
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground py-2">No items found</p>}
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {Object.entries(grouped).map(([category, items]) => (
              <Collapsible key={category} open={openCategories[category]} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger className="flex items-center gap-1 w-full py-1 text-xs font-medium hover:text-primary">
                  {openCategories[category] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {category}
                  <Badge variant="secondary" className="ml-auto text-[10px] h-4">{items.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-0.5">
                  {items.map(item => (
                    <CatalogButton
                      key={item.id}
                      item={item}
                      selected={selectedCatalogId === item.id}
                      onSelect={() => {
                        onSelectCatalog(selectedCatalogId === item.id ? null : item.id);
                        onSelectAssembly(null);
                        const isLinear = ['Conduit', 'Containment', 'Cable'].includes(item.category);
                        if (isLinear && activeTool !== 'linear') onToolChange('linear');
                        else if (!isLinear && activeTool !== 'count') onToolChange('count');
                      }}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function CatalogButton({ item, selected, onSelect }: { item: TakeoffCatalogItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
        selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      }`}
      onClick={onSelect}
    >
      <span className="block truncate">{item.name}</span>
      {item.conduit_size && (
        <span className="text-[10px] opacity-70">{item.conduit_size} {item.conduit_type}</span>
      )}
    </button>
  );
}
