import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// South African Public Holidays calculation
function getSAPublicHolidays(year: number): Date[] {
  const holidays: Date[] = [
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
  holidays.push(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000)); // Family Day

  // Handle observed holidays (Sunday -> Monday)
  const observedHolidays: Date[] = [];
  holidays.forEach(holiday => {
    if (holiday.getDay() === 0) {
      observedHolidays.push(new Date(holiday.getTime() + 24 * 60 * 60 * 1000));
    }
  });

  return [...holidays, ...observedHolidays];
}

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

function isSAPublicHoliday(date: Date): boolean {
  const holidays = getSAPublicHolidays(date.getFullYear());
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(h => h.toISOString().split('T')[0] === dateStr);
}

function subBusinessDaysWithHolidays(date: Date, businessDays: number): Date {
  let currentDate = new Date(date);
  let remainingDays = businessDays;

  while (remainingDays > 0) {
    currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    if (isSAPublicHoliday(currentDate)) continue;
    
    remainingDays--;
  }

  return currentDate;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all tenants with opening_date
    const { data: tenants, error: fetchError } = await supabase
      .from("tenants")
      .select("id, opening_date, beneficial_occupation_days")
      .not("opening_date", "is", null);

    if (fetchError) throw fetchError;

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No tenants with opening dates found", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const tenant of tenants) {
      try {
        const openingDate = new Date(tenant.opening_date);
        const beneficialDays = tenant.beneficial_occupation_days || 90;
        
        // Calculate BO date (opening_date - beneficial_occupation_days)
        const boDate = addDays(openingDate, -beneficialDays);
        
        // Calculate deadline: 40 business days before BO date
        const deadlineDate = subBusinessDaysWithHolidays(boDate, 40);
        const formattedDeadline = formatDate(deadlineDate);

        // Update tenant with calculated deadlines
        const { error: updateError } = await supabase
          .from("tenants")
          .update({
            db_last_order_date: formattedDeadline,
            db_delivery_date: formattedDeadline,
            lighting_last_order_date: formattedDeadline,
            lighting_delivery_date: formattedDeadline,
          })
          .eq("id", tenant.id);

        if (updateError) {
          errors.push(`Tenant ${tenant.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Tenant ${tenant.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Populated deadline dates for ${updatedCount} of ${tenants.length} tenants`,
        updated: updatedCount,
        total: tenants.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error populating deadlines:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
