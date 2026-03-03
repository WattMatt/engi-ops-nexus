import { useOpsInbox, useResolvedAssignees } from "@/hooks/useOpsInbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Inbox, Loader2 } from "lucide-react";
import { format } from "date-fns";

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

const priorityVariant: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function OpsInbox() {
  const { data: items = [], isLoading } = useOpsInbox();
  const { data: profileMap = {} } = useResolvedAssignees(items);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Inbox className="h-6 w-6" />
          Ops Inbox
        </h1>
        <p className="text-muted-foreground">
          Unified view of synced items from external sources
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Inbox className="h-10 w-10 mb-2" />
          <p>No items in the inbox yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const assignees = (item.assignee_ids ?? [])
                  .map((id) => profileMap[id])
                  .filter(Boolean);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[280px] truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {item.status ?? "open"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={`capitalize text-xs ${priorityVariant[item.priority] ?? ""}`}
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.source}
                    </TableCell>
                    <TableCell>
                      {assignees.length > 0 ? (
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 4).map((p) => (
                            <Tooltip key={p.id}>
                              <TooltipTrigger asChild>
                                <Avatar className="h-7 w-7 border-2 border-background">
                                  <AvatarImage src={p.avatar_url ?? undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(p.full_name, p.email)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                {p.full_name ?? p.email}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {assignees.length > 4 && (
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-[10px] font-medium border-2 border-background">
                              +{assignees.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.due_date
                        ? format(new Date(item.due_date), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {item.created_at
                        ? format(new Date(item.created_at), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
