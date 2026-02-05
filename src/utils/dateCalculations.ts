 import { subBusinessDays, differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';
 
 export type DeadlineStatus = 'overdue' | 'approaching' | 'normal';
 
 export interface OrderDeadlines {
   dbLastOrderDate: Date;
   dbDeliveryDate: Date;
   lightingLastOrderDate: Date;
   lightingDeliveryDate: Date;
 }
 
 /**
  * Calculate order deadlines based on Beneficial Occupation (BO) date
  * Uses 40 business days (8 weeks x 5 weekdays) before BO date
  * @param boDate - The Beneficial Occupation date
  * @returns Object containing all 4 calculated deadline dates
  */
 export function calculateOrderDeadlines(boDate: Date): OrderDeadlines {
   const businessDaysBefore = 40; // 8 weeks x 5 weekdays
   
   const deadlineDate = subBusinessDays(boDate, businessDaysBefore);
   
   return {
     dbLastOrderDate: deadlineDate,
     dbDeliveryDate: deadlineDate,
     lightingLastOrderDate: deadlineDate,
     lightingDeliveryDate: deadlineDate,
   };
 }
 
 /**
  * Determine the status of a deadline date
  * @param date - The deadline date to check
  * @param approachingDays - Number of days to consider as "approaching" (default 14)
  * @returns 'overdue' | 'approaching' | 'normal'
  */
 export function getDeadlineStatus(date: Date | null, approachingDays = 14): DeadlineStatus {
   if (!date) return 'normal';
   
   const today = startOfDay(new Date());
   const deadlineDate = startOfDay(date);
   
   if (isBefore(deadlineDate, today)) {
     return 'overdue';
   }
   
   const daysUntil = differenceInCalendarDays(deadlineDate, today);
   
   if (daysUntil <= approachingDays) {
     return 'approaching';
   }
   
   return 'normal';
 }
 
 /**
  * Get the number of days until/since a deadline
  * @param date - The deadline date
  * @returns Positive number for days remaining, negative for days overdue
  */
 export function getDaysUntilDeadline(date: Date | null): number | null {
   if (!date) return null;
   
   const today = startOfDay(new Date());
   const deadlineDate = startOfDay(date);
   
   return differenceInCalendarDays(deadlineDate, today);
 }
 
 /**
  * Format deadline status text
  * @param days - Days until deadline (negative = overdue)
  * @returns Formatted string like "5d left" or "3d overdue"
  */
 export function formatDeadlineText(days: number | null): string {
   if (days === null) return '';
   
   if (days === 0) return 'Today';
   if (days > 0) return `${days}d left`;
   return `${Math.abs(days)}d overdue`;
 }