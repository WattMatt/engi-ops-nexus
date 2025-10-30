import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { backup_id, recovery_type = 'full', tables_to_restore } = await req.json();
    
    console.log(`Starting ${recovery_type} restore from backup ${backup_id}...`);

    // Create recovery operation record
    const { data: recoveryRecord, error: recoveryError } = await supabase
      .from('recovery_operations')
      .insert({
        backup_id,
        recovery_type,
        tables_to_restore,
        status: 'running',
        initiated_by: user.id,
        initiated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (recoveryError) {
      throw new Error(`Failed to create recovery record: ${recoveryError.message}`);
    }

    try {
      // Get backup file info
      const { data: backup, error: backupFetchError } = await supabase
        .from('backup_history')
        .select('*')
        .eq('id', backup_id)
        .single();

      if (backupFetchError || !backup) {
        throw new Error('Backup not found');
      }

      // Download backup file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('backups')
        .download(backup.file_path);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      // Parse backup data
      const text = await fileData.text();
      const backupData = JSON.parse(text);

      const recordsRestored: Record<string, number> = {};

      // Determine which tables to restore
      const tablesToProcess = recovery_type === 'selective' && tables_to_restore
        ? tables_to_restore
        : Object.keys(backupData);

      // Restore each table
      for (const table of tablesToProcess) {
        if (!backupData[table]) continue;

        try {
          const records = backupData[table];
          
          // Insert records (upsert to avoid conflicts)
          const { error: insertError } = await supabase
            .from(table)
            .upsert(records, { onConflict: 'id' });

          if (insertError) {
            console.error(`Error restoring ${table}:`, insertError);
            continue;
          }

          recordsRestored[table] = records.length;
          console.log(`Restored ${records.length} records to ${table}`);
        } catch (tableError) {
          console.error(`Failed to restore table ${table}:`, tableError);
        }
      }

      // Update recovery record
      await supabase
        .from('recovery_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_restored: recordsRestored,
        })
        .eq('id', recoveryRecord.id);

      console.log(`Restore completed: ${Object.keys(recordsRestored).length} tables`);

      return new Response(
        JSON.stringify({
          success: true,
          recovery_id: recoveryRecord.id,
          tables_restored: Object.keys(recordsRestored).length,
          records_restored: recordsRestored,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update recovery record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('recovery_operations')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', recoveryRecord.id);

      throw error;
    }
  } catch (error) {
    console.error('Restore error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
