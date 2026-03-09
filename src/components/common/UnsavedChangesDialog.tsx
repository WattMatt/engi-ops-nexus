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

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

/**
 * Reusable dialog shown when users try to navigate away with unsaved changes.
 * Pair with the `useUnsavedChanges` hook:
 *
 * ```tsx
 * const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChanges({
 *   hasUnsavedChanges: isDirty,
 * });
 *
 * <UnsavedChangesDialog
 *   isOpen={isBlocked}
 *   onConfirm={confirmNavigation}
 *   onCancel={cancelNavigation}
 * />
 * ```
 */
export const UnsavedChangesDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Unsaved Changes",
  description = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?",
}: UnsavedChangesDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Stay on Page</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Leave Page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
