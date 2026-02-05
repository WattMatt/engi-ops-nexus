/**
 * Portal User Identity Dialog
 * Prompts users for their name/email on first visit to track individual users
 * accessing the contractor portal through a shared link
 */

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { User } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';

const STORAGE_KEY = 'contractor_portal_user';

const userSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email too long'),
});

type UserFormData = z.infer<typeof userSchema>;

export interface PortalUserIdentity {
  name: string;
  email: string;
  timestamp: string;
}

interface PortalUserIdentityDialogProps {
  /** Called when user identity is confirmed (either from storage or new entry) */
  onIdentityConfirmed: (identity: PortalUserIdentity) => void;
  /** Project ID to scope the storage key */
  projectId: string;
  /** Token to scope the storage key */
  token: string;
}

export function PortalUserIdentityDialog({
  onIdentityConfirmed,
  projectId,
  token,
}: PortalUserIdentityDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const storageKey = `${STORAGE_KEY}_${projectId}_${token.slice(0, 8)}`;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Check for existing identity on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const identity = JSON.parse(stored) as PortalUserIdentity;
        if (identity.name && identity.email) {
          onIdentityConfirmed(identity);
          setHasChecked(true);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse stored identity:', e);
    }
    
    // No valid identity found, show dialog
    setOpen(true);
    setHasChecked(true);
  }, [storageKey, onIdentityConfirmed]);

   const onSubmit = async (data: UserFormData) => {
    const identity: PortalUserIdentity = {
      name: data.name,
      email: data.email,
      timestamp: new Date().toISOString(),
    };

    // Store in localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(identity));
    } catch (e) {
      console.error('Failed to store identity:', e);
    }

     // Look up token_id from the token string
     let tokenId: string | null = null;
     try {
       const { data: tokenData } = await supabase
         .from('contractor_portal_tokens')
         .select('id')
         .eq('token', token)
         .single();
       tokenId = tokenData?.id || null;
     } catch (e) {
       console.error('Failed to look up token_id:', e);
     }
 
     // Persist to database for email notifications
     try {
       const { error } = await supabase
         .from('portal_user_sessions')
         .upsert({
           token_id: tokenId,
           project_id: projectId,
           user_name: data.name,
           user_email: data.email,
           last_accessed_at: new Date().toISOString(),
         }, {
           onConflict: 'token_id,user_email',
           ignoreDuplicates: false,
         });
 
       if (error) {
         console.error('Failed to persist user session:', error);
       } else {
         console.log('Portal user session persisted:', data.email);
       }
     } catch (e) {
       console.error('Failed to persist user session to database:', e);
     }
 
    onIdentityConfirmed(identity);
    setOpen(false);
  };

  if (!hasChecked) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome to the Contractor Portal</DialogTitle>
          <DialogDescription className="text-center">
            Please enter your details so we can track your activity and keep you updated.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Continue to Portal
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to get the current portal user identity
 * Returns null if not yet identified
 */
export function usePortalUserIdentity(projectId: string, token: string): PortalUserIdentity | null {
  const storageKey = `${STORAGE_KEY}_${projectId}_${token.slice(0, 8)}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored) as PortalUserIdentity;
    }
  } catch (e) {
    console.error('Failed to get portal user identity:', e);
  }
  
  return null;
}

/**
 * Clear stored portal user identity (for "Not you?" functionality)
 */
export function clearPortalUserIdentity(projectId: string, token: string): void {
  const storageKey = `${STORAGE_KEY}_${projectId}_${token.slice(0, 8)}`;
  try {
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.error('Failed to clear portal user identity:', e);
  }
}
