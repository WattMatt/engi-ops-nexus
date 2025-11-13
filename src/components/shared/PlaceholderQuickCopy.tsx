import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, ChevronDown, ChevronRight, Search } from "lucide-react";
import { getPlaceholdersByCategory } from "@/utils/templatePlaceholders";
import { useToast } from "@/hooks/use-toast";

export const PlaceholderQuickCopy = () => {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Project Information", "Prepared For", "Prepared By"])
  );
  const { toast } = useToast();
  const placeholdersByCategory = getPlaceholdersByCategory();

  const copyToClipboard = (placeholder: string, description: string) => {
    navigator.clipboard.writeText(placeholder);
    toast({
      title: "Copied!",
      description: `${placeholder} copied to clipboard`,
    });
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = Object.entries(placeholdersByCategory).map(([category, placeholders]) => {
    const filtered = placeholders.filter(
      (p) =>
        p.placeholder.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );
    return { category, placeholders: filtered };
  }).filter(({ placeholders }) => placeholders.length > 0);

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-2 text-sm">Template Placeholders</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search placeholders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredCategories.map(({ category, placeholders }) => (
            <Collapsible
              key={category}
              open={expandedCategories.has(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-accent/50 p-2 rounded-md transition-colors">
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{category}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {placeholders.length}
                </span>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-1 space-y-1">
                {placeholders.map((placeholder) => (
                  <div
                    key={placeholder.key}
                    className="ml-6 p-2 rounded-md hover:bg-accent/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono text-primary block truncate">
                          {placeholder.placeholder}
                        </code>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {placeholder.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(placeholder.placeholder, placeholder.description)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
