import { useState, useCallback } from "react";
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

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

/**
 * Reusable confirmation dialog for destructive actions (delete, remove, reset).
 *
 * Usage:
 * ```tsx
 * const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
 *
 * <ConfirmDeleteDialog
 *   open={!!deleteTarget}
 *   onOpenChange={(open) => !open && setDeleteTarget(null)}
 *   onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
 *   title="Delete Item"
 *   description="This action cannot be undone."
 * />
 * ```
 *
 * Or use the companion hook for simpler inline usage:
 * ```tsx
 * const { dialog, requestConfirm } = useConfirmDelete({
 *   onConfirm: (id) => deleteMutation.mutate(id),
 * });
 *
 * <Button onClick={() => requestConfirm(item.id, item.name)}>Delete</Button>
 * {dialog}
 * ```
 */
export const ConfirmDeleteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone. This will permanently delete this item.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmDeleteDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Hook that provides a confirm-before-delete pattern with minimal boilerplate.
 * Returns the dialog element to render and a function to trigger confirmation.
 */
interface UseConfirmDeleteOptions<T = string> {
  onConfirm: (target: T) => void;
  title?: string | ((target: T, label?: string) => string);
  description?: string | ((target: T, label?: string) => string);
  confirmLabel?: string;
}

export function useConfirmDelete<T = string>({
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
}: UseConfirmDeleteOptions<T>) {
  const [target, setTarget] = useState<{ value: T; label?: string } | null>(null);

  const requestConfirm = useCallback((value: T, label?: string) => {
    setTarget({ value, label });
  }, []);

  const resolvedTitle = target
    ? typeof title === "function"
      ? title(target.value, target.label)
      : title ?? (target.label ? `Delete "${target.label}"?` : "Are you sure?")
    : "";

  const resolvedDescription = target
    ? typeof description === "function"
      ? description(target.value, target.label)
      : description ?? "This action cannot be undone."
    : "";

  const dialog = (
    <ConfirmDeleteDialog
      open={!!target}
      onOpenChange={(open) => !open && setTarget(null)}
      onConfirm={() => {
        if (target) {
          onConfirm(target.value);
          setTarget(null);
        }
      }}
      title={resolvedTitle}
      description={resolvedDescription}
      confirmLabel={confirmLabel}
    />
  );

  return { dialog, requestConfirm, isOpen: !!target };
}
