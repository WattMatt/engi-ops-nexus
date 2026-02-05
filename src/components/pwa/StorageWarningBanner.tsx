 /**
  * Storage Warning Banner
  * Displays when storage usage exceeds warning thresholds
  */
 
 import { useState, useEffect } from 'react';
 import { AlertTriangle, X, HardDrive, Settings } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useStorageQuota } from '@/hooks/useStorageQuota';
 import { getStorageLevelBgColor } from '@/lib/storageQuota';
 import { cn } from '@/lib/utils';
 import { useNavigate } from 'react-router-dom';
 
 export function StorageWarningBanner() {
   const navigate = useNavigate();
   const { level, percentage, usageFormatted, quotaFormatted } = useStorageQuota({
     showWarnings: false, // We're showing the banner instead
   });
   const [dismissed, setDismissed] = useState(false);
   const [dismissedLevel, setDismissedLevel] = useState<string | null>(null);
 
   // Reset dismissed state when level changes (gets worse)
   useEffect(() => {
     if (level !== dismissedLevel && level !== 'healthy') {
       setDismissed(false);
     }
   }, [level, dismissedLevel]);
 
   // Don't show if healthy or dismissed
   if (level === 'healthy' || dismissed) {
     return null;
   }
 
   const handleDismiss = () => {
     setDismissed(true);
     setDismissedLevel(level);
   };
 
   const handleManageStorage = () => {
     navigate('/dashboard/settings?tab=app');
   };
 
   const getMessage = () => {
     switch (level) {
       case 'danger':
         return {
           title: 'Storage Critically Full',
           description: 'New offline saves are blocked. Free up space immediately.',
           icon: AlertTriangle,
         };
       case 'critical':
         return {
           title: 'Storage Almost Full',
           description: 'Sync your data and clear old records to free up space.',
           icon: AlertTriangle,
         };
       case 'warning':
         return {
           title: 'Storage Getting Full',
           description: 'Consider syncing and clearing old offline data.',
           icon: HardDrive,
         };
       default:
         return null;
     }
   };
 
   const message = getMessage();
   if (!message) return null;
 
   const Icon = message.icon;
 
   return (
     <div
       className={cn(
         'fixed top-0 left-0 right-0 z-50 border-b p-2 px-4',
         getStorageLevelBgColor(level)
       )}
     >
       <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <Icon className={cn(
             'h-5 w-5 shrink-0',
             level === 'danger' ? 'text-destructive' :
             level === 'critical' ? 'text-orange-500' : 'text-yellow-500'
           )} />
           <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
             <span className="font-medium text-sm">
               {message.title} ({Math.round(percentage)}%)
             </span>
             <span className="text-xs text-muted-foreground hidden sm:inline">
               {usageFormatted} / {quotaFormatted}
             </span>
           </div>
         </div>
 
         <div className="flex items-center gap-2">
           <Button
             size="sm"
             variant="outline"
             onClick={handleManageStorage}
             className="text-xs h-7"
           >
             <Settings className="h-3 w-3 mr-1" />
             Manage
           </Button>
           {level !== 'danger' && (
             <Button
               size="sm"
               variant="ghost"
               onClick={handleDismiss}
               className="h-7 w-7 p-0"
             >
               <X className="h-4 w-4" />
             </Button>
           )}
         </div>
       </div>
     </div>
   );
 }