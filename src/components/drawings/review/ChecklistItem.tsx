/**
 * Checklist Item Component
 * Individual checkbox item with optional notes and document link
 */

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DrawingChecklistItem } from '@/types/drawingChecklists';

interface ChecklistItemProps {
  item: DrawingChecklistItem;
  isChecked: boolean;
  notes?: string;
  onToggle: (itemId: string, checked: boolean, notes?: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  level?: number;
}

export function ChecklistItem({
  item,
  isChecked,
  notes,
  onToggle,
  onNotesChange,
  level = 0,
}: ChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localNotes, setLocalNotes] = useState(notes || '');
  const hasChildren = item.children && item.children.length > 0;
  
  const handleToggle = () => {
    onToggle(item.id, !isChecked, localNotes);
  };
  
  const handleNotesSave = () => {
    onNotesChange(item.id, localNotes);
  };
  
  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group",
          level > 0 && "ml-6"
        )}
      >
        {/* Expand/Collapse button for parent items */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <div className="w-5" /> // Spacer for alignment
        )}
        
        {/* Checkbox */}
        <Checkbox
          id={item.id}
          checked={isChecked}
          onCheckedChange={handleToggle}
          className="mt-0.5"
        />
        
        {/* Label */}
        <label
          htmlFor={item.id}
          className={cn(
            "flex-1 text-sm cursor-pointer leading-relaxed",
            isChecked && "text-muted-foreground line-through"
          )}
        >
          {item.label}
        </label>
        
        {/* Document link icon */}
        {item.linked_document_type && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 hover:opacity-100"
            title={`Linked to: ${item.linked_document_type}`}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
          </Button>
        )}
        
        {/* Notes popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 opacity-0 group-hover:opacity-50 hover:!opacity-100",
                localNotes && "opacity-50"
              )}
            >
              <MessageSquare className={cn(
                "h-3.5 w-3.5",
                localNotes && "text-primary"
              )} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              <Textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Add notes about this item..."
                className="min-h-[80px] text-sm"
              />
              <Button size="sm" onClick={handleNotesSave}>
                Save Notes
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Check indicator */}
        {isChecked && (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l-2 border-muted ml-4">
          {item.children!.map((child) => (
            <ChecklistItem
              key={child.id}
              item={child}
              isChecked={false} // Will be passed from parent
              notes=""
              onToggle={onToggle}
              onNotesChange={onNotesChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
