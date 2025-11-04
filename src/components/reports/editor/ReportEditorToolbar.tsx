import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Table,
  Image,
  Link,
  Undo,
  Redo,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReportEditorToolbar() {
  return (
    <div className="border-b bg-muted/50 px-4 py-2 flex items-center gap-2 overflow-x-auto">
      {/* Undo/Redo */}
      <Button variant="ghost" size="sm">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Family */}
      <Select defaultValue="helvetica">
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="helvetica">Helvetica</SelectItem>
          <SelectItem value="times">Times New Roman</SelectItem>
          <SelectItem value="courier">Courier</SelectItem>
          <SelectItem value="arial">Arial</SelectItem>
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select defaultValue="10">
        <SelectTrigger className="w-[80px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="8">8</SelectItem>
          <SelectItem value="9">9</SelectItem>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="11">11</SelectItem>
          <SelectItem value="12">12</SelectItem>
          <SelectItem value="14">14</SelectItem>
          <SelectItem value="16">16</SelectItem>
          <SelectItem value="18">18</SelectItem>
          <SelectItem value="20">20</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <Button variant="ghost" size="sm">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Underline className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <Button variant="ghost" size="sm">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <AlignRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <Button variant="ghost" size="sm">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Insert */}
      <Button variant="ghost" size="sm">
        <Table className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Image className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Link className="h-4 w-4" />
      </Button>
    </div>
  );
}