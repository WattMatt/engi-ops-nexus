import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2, FileText, Table, Image, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportSectionManagerProps {
  sections: any[];
  activeSection: string | null;
  onSectionSelect: (sectionId: string) => void;
  onSectionReorder: (sections: any[]) => void;
  onAddSection: (type: "text" | "table" | "image" | "chart") => void;
  onDeleteSection: (sectionId: string) => void;
}

export function ReportSectionManager({
  sections,
  activeSection,
  onSectionSelect,
  onSectionReorder,
  onAddSection,
  onDeleteSection,
}: ReportSectionManagerProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onSectionReorder(items);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "table":
        return <Table className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "chart":
        return <BarChart className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col border-r bg-card">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">Sections</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddSection("text")}>
              <FileText className="h-4 w-4 mr-2" />
              Text Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSection("table")}>
              <Table className="h-4 w-4 mr-2" />
              Table Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSection("image")}>
              <Image className="h-4 w-4 mr-2" />
              Image Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSection("chart")}>
              <BarChart className="h-4 w-4 mr-2" />
              Chart Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="p-2 space-y-1"
              >
                {sections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-accent cursor-pointer transition-colors",
                          activeSection === section.id && "bg-accent border-primary",
                          snapshot.isDragging && "shadow-lg"
                        )}
                        onClick={() => onSectionSelect(section.id)}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {getSectionIcon(section.type)}
                          <span className="text-sm truncate">{section.title}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSection(section.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
    </div>
  );
}