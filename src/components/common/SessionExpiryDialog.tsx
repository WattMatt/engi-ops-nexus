import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck } from 'lucide-react';

interface SessionExpiryDialogProps {
  open: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function SessionExpiryDialog({
  open,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionExpiryDialogProps) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  const progressPercent = (secondsRemaining / 60) * 100;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldCheck className="h-5 w-5" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your session will automatically end for security purposes.
              You will be logged out in:
            </p>
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="text-3xl font-mono font-bold text-foreground tabular-nums">
                {timeDisplay}
              </span>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-destructive rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click "Stay Logged In" to extend your session, or "Log Out" to end it now.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
          <Button onClick={onStayLoggedIn} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
