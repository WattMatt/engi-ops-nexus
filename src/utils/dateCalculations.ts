 import { subBusinessDays, differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';
 
 /**
  * South African Public Holidays
  * Updated annually - includes fixed dates and calculated dates (like Easter)
  */
 export function getSAPublicHolidays(year: number): Date[] {
   const holidays: Date[] = [
     // Fixed holidays
     new Date(year, 0, 1),   // New Year's Day
     new Date(year, 2, 21),  // Human Rights Day
     new Date(year, 3, 27),  // Freedom Day
     new Date(year, 4, 1),   // Workers' Day
     new Date(year, 5, 16),  // Youth Day
     new Date(year, 7, 9),   // National Women's Day
     new Date(year, 8, 24),  // Heritage Day
     new Date(year, 11, 16), // Day of Reconciliation
     new Date(year, 11, 25), // Christmas Day
     new Date(year, 11, 26), // Day of Goodwill
   ];
 
   // Calculate Easter-based holidays
   const easter = calculateEasterSunday(year);
   holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)); // Good Friday
   holidays.push(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000)); // Family Day (Easter Monday)
 
   // Handle observed holidays (when holiday falls on Sunday, Monday is observed)
   const observedHolidays: Date[] = [];
   holidays.forEach(holiday => {
     if (holiday.getDay() === 0) { // Sunday
       observedHolidays.push(new Date(holiday.getTime() + 24 * 60 * 60 * 1000)); // Monday
     }
   });
 
   return [...holidays, ...observedHolidays];
 }
 
 /**
  * Calculate Easter Sunday using the Anonymous Gregorian algorithm
  */
 function calculateEasterSunday(year: number): Date {
   const a = year % 19;
   const b = Math.floor(year / 100);
   const c = year % 100;
   const d = Math.floor(b / 4);
   const e = b % 4;
   const f = Math.floor((b + 8) / 25);
   const g = Math.floor((b - f + 1) / 3);
   const h = (19 * a + b - d - g + 15) % 30;
   const i = Math.floor(c / 4);
   const k = c % 4;
   const l = (32 + 2 * e + 2 * i - h - k) % 7;
   const m = Math.floor((a + 11 * h + 22 * l) / 451);
   const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
   const day = ((h + l - 7 * m + 114) % 31) + 1;
   return new Date(year, month, day);
 }
 
 /**
  * Check if a date is a SA public holiday
  */
 export function isSAPublicHoliday(date: Date): boolean {
   const holidays = getSAPublicHolidays(date.getFullYear());
   const dateStr = date.toISOString().split('T')[0];
   return holidays.some(h => h.toISOString().split('T')[0] === dateStr);
 }
 
 /**
  * Subtract business days excluding weekends AND SA public holidays
  */
 export function subBusinessDaysWithHolidays(date: Date, businessDays: number): Date {
   let currentDate = new Date(date);
   let remainingDays = businessDays;
 
   while (remainingDays > 0) {
     currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000); // Go back one day
     const dayOfWeek = currentDate.getDay();
     
     // Skip weekends (0 = Sunday, 6 = Saturday)
     if (dayOfWeek === 0 || dayOfWeek === 6) {
       continue;
     }
     
     // Skip SA public holidays
     if (isSAPublicHoliday(currentDate)) {
       continue;
     }
     
     remainingDays--;
   }
 
   return currentDate;
 }
 
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
   
   // Use holiday-aware calculation for SA public holidays
   const deadlineDate = subBusinessDaysWithHolidays(boDate, businessDaysBefore);
   
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