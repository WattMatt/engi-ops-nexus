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

    const { backup_type = 'full', job_id } = await req.json();
    
    console.log(`Starting ${backup_type} backup...`);

    // Create backup history record
    const { data: backupRecord, error: backupError } = await supabase
      .from('backup_history')
      .insert({
        backup_type,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (backupError) {
      throw new Error(`Failed to create backup record: ${backupError.message}`);
    }

    try {
      // Get last backup time for incremental
      let lastBackupTime = null;
      if (backup_type === 'incremental') {
        const { data: lastBackup } = await supabase
          .from('backup_history')
          .select('completed_at')
          .eq('backup_type', 'full')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        
        lastBackupTime = lastBackup?.completed_at;
      }

      // Tables to backup
      const tablesToBackup = [
        'profiles', 'projects', 'project_members', 'cost_reports', 'cost_categories',
        'cost_line_items', 'cable_schedules', 'cable_entries', 'electrical_budgets',
        'budget_sections', 'budget_line_items', 'specifications', 'employees',
        'attendance_records', 'payroll', 'leave_requests', 'benefits',
        'conversations', 'messages', 'invoices', 'user_activity_logs'
      ];

      const backupData: Record<string, any> = {};
      const recordsCounts: Record<string, number> = {};

      // Export each table
      for (const table of tablesToBackup) {
        try {
          let query = supabase.from(table).select('*');
          
          // For incremental, only get updated records
          if (backup_type === 'incremental' && lastBackupTime) {
            query = query.gte('updated_at', lastBackupTime);
          }

          const { data, error } = await query;
          
          if (error) {
            console.error(`Error backing up ${table}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            backupData[table] = data;
            recordsCounts[table] = data.length;
          }
        } catch (tableError) {
          console.error(`Failed to backup table ${table}:`, tableError);
        }
      }

      // Convert to JSON and compress
      const jsonData = JSON.stringify(backupData);
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);
      
      // Upload to storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${backup_type}-${timestamp}.json`;
      const filePath = `database/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(filePath, data, {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Update backup record
      await supabase
        .from('backup_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_path: filePath,
          file_size_bytes: data.length,
          tables_included: Object.keys(backupData),
          records_count: recordsCounts,
          metadata: {
            duration_ms: Date.now() - new Date(backupRecord.started_at).getTime(),
          },
        })
        .eq('id', backupRecord.id);

      // Create backup file record
      await supabase.from('backup_files').insert({
        backup_id: backupRecord.id,
        file_type: 'database',
        file_path: filePath,
        file_size_bytes: data.length,
        compression_type: 'none',
        encryption_enabled: false,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

      console.log(`Backup completed: ${Object.keys(backupData).length} tables, ${data.length} bytes`);

      return new Response(
        JSON.stringify({
          success: true,
          backup_id: backupRecord.id,
          file_path: filePath,
          tables_count: Object.keys(backupData).length,
          records_count: recordsCounts,
          file_size: data.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update backup record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('backup_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', backupRecord.id);

      throw error;
    }
  } catch (error) {
    console.error('Backup error:', error);
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
