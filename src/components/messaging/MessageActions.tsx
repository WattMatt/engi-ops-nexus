import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, Pin, MessageSquare, Reply, Forward, Star } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { useAddReaction } from "./MessageReactions";
import { useStarMessage, useIsMessageStarred } from "./StarredMessages";

interface MessageActionsProps {
  messageId: string;
  isOwn: boolean;
  isPinned: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReply: () => void;
  onForward?: () => void;
}

export function MessageActions({
  messageId,
  isOwn,
  isPinned,
  onEdit,
  onDelete,
  onPin,
  onReply,
  onForward,
}: MessageActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const addReaction = useAddReaction();
  const starMessage = useStarMessage();
  const { data: isStarred = false } = useIsMessageStarred(messageId);

  const handleReaction = (emoji: string) => {
    addReaction.mutate({ messageId, emoji });
  };

  const handleStar = () => {
    starMessage.mutate({ messageId, isStarred });
  };

  return (
    <>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <EmojiPicker onSelect={handleReaction} />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onReply}
        >
          <Reply className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onReply}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Reply in thread
            </DropdownMenuItem>
            {onForward && (
              <DropdownMenuItem onClick={onForward}>
                <Forward className="mr-2 h-4 w-4" />
                Forward message
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onPin}>
              <Pin className="mr-2 h-4 w-4" />
              {isPinned ? "Unpin message" : "Pin message"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStar}>
              <Star className={`mr-2 h-4 w-4 ${isStarred ? "fill-primary text-primary" : ""}`} />
              {isStarred ? "Unstar message" : "Star message"}
            </DropdownMenuItem>
            {isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete message
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
