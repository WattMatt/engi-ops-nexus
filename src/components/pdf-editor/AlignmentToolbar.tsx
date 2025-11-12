import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from "lucide-react";

interface AlignmentToolbarProps {
  selectedCount: number;
  onAlign: (type: AlignmentType) => void;
}

export type AlignmentType =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v';

export const AlignmentToolbar = ({
  selectedCount,
  onAlign,
}: AlignmentToolbarProps) => {
  if (selectedCount < 2) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-sm">
      <span className="text-xs font-medium text-muted-foreground px-2">
        {selectedCount} selected
      </span>

      <Separator orientation="vertical" className="h-6" />

      {/* Horizontal Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('left')}
          title="Align Left"
        >
          <AlignHorizontalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('center-h')}
          title="Align Center (Horizontal)"
        >
          <AlignHorizontalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('right')}
          title="Align Right"
        >
          <AlignHorizontalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Vertical Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('top')}
          title="Align Top"
        >
          <AlignVerticalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('center-v')}
          title="Align Center (Vertical)"
        >
          <AlignVerticalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('bottom')}
          title="Align Bottom"
        >
          <AlignVerticalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Distribution */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('distribute-h')}
          title="Distribute Horizontally"
        >
          <AlignHorizontalSpaceAround className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAlign('distribute-v')}
          title="Distribute Vertically"
        >
          <AlignVerticalSpaceAround className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
