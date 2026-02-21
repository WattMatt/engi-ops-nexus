import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  try {
    // Connect to SOURCE database
    const sourceDbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!sourceDbUrl) throw new Error('SUPABASE_DB_URL not available');

    log('Connecting to source database...');
    const source = postgres(sourceDbUrl, { max: 1 });

    // Connect to TARGET database
    const targetUrl = Deno.env.get('TARGET_SUPABASE_URL');
    const targetServiceKey = Deno.env.get('TARGET_SUPABASE_SERVICE_ROLE_KEY');
    const targetDbPassword = Deno.env.get('TARGET_DB_PASSWORD');

    if (!targetUrl || !targetServiceKey || !targetDbPassword) {
      throw new Error('Missing target database credentials');
    }

    // Extract project ref from URL: https://xyz.supabase.co -> xyz
    const targetRef = targetUrl.replace('https://', '').split('.')[0];
    // URL-encode password to handle special characters
    const encodedPassword = encodeURIComponent(targetDbPassword);
    const targetDbUrl = `postgresql://postgres:${encodedPassword}@db.${targetRef}.supabase.co:5432/postgres`;

    log('Connecting to target database...');
    const target = postgres(targetDbUrl, { max: 1 });

    // Test target connection
    const testResult = await target`SELECT current_database()`;
    log(`Target DB connected: ${testResult[0].current_database}`);

    // ============================================================
    // STEP 1: Extract and create ENUMS
    // ============================================================
    log('--- STEP 1: Extracting enums ---');
    const enums = await source`
      SELECT t.typname as enum_name, 
             string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `;

    for (const en of enums) {
      const values = en.enum_values.split(',').map((v: string) => `'${v}'`).join(', ');
      const sql = `DO $$ BEGIN CREATE TYPE public.${en.enum_name} AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;
      try {
        await target.unsafe(sql);
        log(`  Created enum: ${en.enum_name}`);
      } catch (e: any) {
        log(`  Enum ${en.enum_name} error: ${e.message}`);
      }
    }

    // ============================================================
    // STEP 2: Extract and create TABLES
    // ============================================================
    log('--- STEP 2: Extracting tables ---');

    // Get all public tables
    const tables = await source`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    log(`  Found ${tables.length} tables`);

    // Get all columns for all tables
    const columns = await source`
      SELECT table_name, column_name, data_type, udt_name,
             character_maximum_length, numeric_precision, numeric_scale,
             is_nullable, column_default, ordinal_position,
             is_identity, identity_generation
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    // Group columns by table
    const tableColumns: Record<string, any[]> = {};
    for (const col of columns) {
      if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
      tableColumns[col.table_name].push(col);
    }

    // Get primary keys
    const pks = await source`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
    `;
    const pkMap: Record<string, string[]> = {};
    for (const pk of pks) {
      if (!pkMap[pk.table_name]) pkMap[pk.table_name] = [];
      pkMap[pk.table_name].push(pk.column_name);
    }

    // Get unique constraints
    const uqs = await source`
      SELECT tc.table_name, tc.constraint_name,
             string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.table_name, tc.constraint_name
    `;

    // Create tables
    let createdTables = 0;
    let failedTables = 0;
    for (const table of tables) {
      const tname = table.table_name;
      const cols = tableColumns[tname] || [];
      if (cols.length === 0) continue;

      const colDefs: string[] = [];
      for (const col of cols) {
        let colType = mapDataType(col);
        let def = `"${col.column_name}" ${colType}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) {
          // Clean up default values
          let defaultVal = col.column_default;
          // Fix auth.uid() references - target may not have same auth setup
          def += ` DEFAULT ${defaultVal}`;
        }
        colDefs.push(def);
      }

      // Add primary key
      if (pkMap[tname]) {
        colDefs.push(`PRIMARY KEY (${pkMap[tname].map(c => `"${c}"`).join(', ')})`);
      }

      // Add unique constraints
      for (const uq of uqs.filter((u: any) => u.table_name === tname)) {
        const uqCols = uq.columns.split(', ').map((c: string) => `"${c.trim()}"`).join(', ');
        colDefs.push(`CONSTRAINT "${uq.constraint_name}" UNIQUE (${uqCols})`);
      }

      const createSql = `CREATE TABLE IF NOT EXISTS public."${tname}" (\n  ${colDefs.join(',\n  ')}\n);`;
      try {
        await target.unsafe(createSql);
        createdTables++;
        if (createdTables % 20 === 0) log(`  Created ${createdTables} tables...`);
      } catch (e: any) {
        failedTables++;
        log(`  FAILED table ${tname}: ${e.message.substring(0, 120)}`);
      }
    }
    log(`  Tables: ${createdTables} created, ${failedTables} failed`);

    // ============================================================
    // STEP 3: Add FOREIGN KEYS (after all tables exist)
    // ============================================================
    log('--- STEP 3: Adding foreign keys ---');
    const fks = await source`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
    `;

    let fkCreated = 0;
    let fkFailed = 0;
    const processedFks = new Set<string>();
    for (const fk of fks) {
      if (processedFks.has(fk.constraint_name)) continue;
      processedFks.add(fk.constraint_name);

      let fkSql = `ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES public."${fk.foreign_table_name}"("${fk.foreign_column_name}")`;
      if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') fkSql += ` ON DELETE ${fk.delete_rule}`;
      if (fk.update_rule && fk.update_rule !== 'NO ACTION') fkSql += ` ON UPDATE ${fk.update_rule}`;
      fkSql += ';';
      
      try {
        await target.unsafe(fkSql);
        fkCreated++;
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          fkFailed++;
          if (fkFailed <= 5) log(`  FK failed ${fk.constraint_name}: ${e.message.substring(0, 100)}`);
        }
      }
    }
    log(`  Foreign keys: ${fkCreated} created, ${fkFailed} failed`);

    // ============================================================
    // STEP 4: Create INDEXES
    // ============================================================
    log('--- STEP 4: Creating indexes ---');
    const indexes = await source`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
        AND indexdef NOT LIKE '%UNIQUE%'
    `;

    let idxCreated = 0;
    for (const idx of indexes) {
      try {
        const idxSql = idx.indexdef.replace(/^CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS');
        await target.unsafe(idxSql);
        idxCreated++;
      } catch (e: any) {
        // Skip errors
      }
    }
    log(`  Indexes: ${idxCreated} created`);

    // ============================================================
    // STEP 5: Create FUNCTIONS
    // ============================================================
    log('--- STEP 5: Creating functions ---');
    const functions = await source`
      SELECT pg_get_functiondef(p.oid) as funcdef, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
    `;

    let funcCreated = 0;
    let funcFailed = 0;
    for (const func of functions) {
      try {
        // Wrap in CREATE OR REPLACE
        let funcSql = func.funcdef;
        if (!funcSql.includes('CREATE OR REPLACE')) {
          funcSql = funcSql.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');
        }
        await target.unsafe(funcSql);
        funcCreated++;
      } catch (e: any) {
        funcFailed++;
        if (funcFailed <= 5) log(`  Func failed ${func.proname}: ${e.message.substring(0, 100)}`);
      }
    }
    log(`  Functions: ${funcCreated} created, ${funcFailed} failed`);

    // ============================================================
    // STEP 6: Create TRIGGERS
    // ============================================================
    log('--- STEP 6: Creating triggers ---');
    const triggers = await source`
      SELECT 
        tg.tgname as trigger_name,
        c.relname as table_name,
        pg_get_triggerdef(tg.oid) as trigger_def
      FROM pg_trigger tg
      JOIN pg_class c ON tg.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND NOT tg.tgisinternal
    `;

    let trigCreated = 0;
    for (const trig of triggers) {
      try {
        // Drop if exists, then create
        await target.unsafe(`DROP TRIGGER IF EXISTS "${trig.trigger_name}" ON public."${trig.table_name}";`);
        await target.unsafe(trig.trigger_def);
        trigCreated++;
      } catch (e: any) {
        // Skip
      }
    }
    log(`  Triggers: ${trigCreated} created`);

    // ============================================================
    // STEP 7: Enable RLS and create POLICIES
    // ============================================================
    log('--- STEP 7: Setting up RLS policies ---');

    // Enable RLS on tables that have it
    const rlsTables = await source`
      SELECT relname 
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
    `;

    for (const t of rlsTables) {
      try {
        await target.unsafe(`ALTER TABLE public."${t.relname}" ENABLE ROW LEVEL SECURITY;`);
      } catch (e: any) {}
    }
    log(`  RLS enabled on ${rlsTables.length} tables`);

    // Create policies
    const policies = await source`
      SELECT 
        schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `;

    let polCreated = 0;
    let polFailed = 0;
    for (const pol of policies) {
      try {
        const permissive = pol.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
        const roles = pol.roles ? `TO ${pol.roles.replace(/[{}]/g, '')}` : '';
        let polSql = `CREATE POLICY "${pol.policyname}" ON public."${pol.tablename}" AS ${permissive} FOR ${pol.cmd} ${roles}`;
        if (pol.qual) polSql += ` USING (${pol.qual})`;
        if (pol.with_check) polSql += ` WITH CHECK (${pol.with_check})`;
        polSql += ';';
        
        await target.unsafe(polSql);
        polCreated++;
      } catch (e: any) {
        polFailed++;
        if (polFailed <= 5) log(`  Policy failed ${pol.policyname}: ${e.message.substring(0, 100)}`);
      }
    }
    log(`  Policies: ${polCreated} created, ${polFailed} failed`);

    // ============================================================
    // STEP 8: Create VIEWS
    // ============================================================
    log('--- STEP 8: Creating views ---');
    const views = await source`
      SELECT viewname, definition
      FROM pg_views
      WHERE schemaname = 'public'
    `;

    let viewCreated = 0;
    for (const v of views) {
      try {
        await target.unsafe(`CREATE OR REPLACE VIEW public."${v.viewname}" AS ${v.definition}`);
        viewCreated++;
      } catch (e: any) {
        log(`  View failed ${v.viewname}: ${e.message.substring(0, 100)}`);
      }
    }
    log(`  Views: ${viewCreated} created`);

    // ============================================================
    // STEP 9: Enable extensions
    // ============================================================
    log('--- STEP 9: Enabling extensions ---');
    const extensions = await source`
      SELECT extname FROM pg_extension 
      WHERE extname NOT IN ('plpgsql', 'pg_stat_statements')
    `;
    for (const ext of extensions) {
      try {
        await target.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}" WITH SCHEMA extensions;`);
        log(`  Extension: ${ext.extname}`);
      } catch (e: any) {
        try {
          await target.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}";`);
          log(`  Extension (default schema): ${ext.extname}`);
        } catch (e2: any) {
          log(`  Extension failed ${ext.extname}: ${e2.message.substring(0, 80)}`);
        }
      }
    }

    // ============================================================
    // STEP 10: Enable realtime publications
    // ============================================================
    log('--- STEP 10: Realtime publications ---');
    const publications = await source`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    `;
    for (const pub of publications) {
      try {
        await target.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE public."${pub.tablename}";`);
      } catch (e: any) {}
    }
    log(`  Realtime: ${publications.length} tables`);

    // Cleanup connections
    await source.end();
    await target.end();

    log('=== SCHEMA REPLICATION COMPLETE ===');

    return new Response(JSON.stringify({
      success: true,
      summary: {
        tables: { created: createdTables, failed: failedTables, total: tables.length },
        foreignKeys: { created: fkCreated, failed: fkFailed },
        indexes: idxCreated,
        functions: { created: funcCreated, failed: funcFailed },
        triggers: trigCreated,
        rlsTables: rlsTables.length,
        policies: { created: polCreated, failed: polFailed },
        views: viewCreated,
      },
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    log(`FATAL ERROR: ${error.message}`);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      logs,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function mapDataType(col: any): string {
  const udt = col.udt_name;

  // Handle array types
  if (col.data_type === 'ARRAY') {
    return udt.replace(/^_/, '') + '[]';
  }

  // Handle user-defined types (enums, etc.)
  if (col.data_type === 'USER-DEFINED') {
    return `public.${udt}`;
  }

  // Special types
  switch (udt) {
    case 'uuid': return 'uuid';
    case 'text': return 'text';
    case 'int4': return 'integer';
    case 'int8': return 'bigint';
    case 'int2': return 'smallint';
    case 'float4': return 'real';
    case 'float8': return 'double precision';
    case 'bool': return 'boolean';
    case 'timestamptz': return 'timestamp with time zone';
    case 'timestamp': return 'timestamp without time zone';
    case 'date': return 'date';
    case 'time': return 'time without time zone';
    case 'timetz': return 'time with time zone';
    case 'jsonb': return 'jsonb';
    case 'json': return 'json';
    case 'numeric': 
      if (col.numeric_precision && col.numeric_scale) {
        return `numeric(${col.numeric_precision}, ${col.numeric_scale})`;
      }
      return 'numeric';
    case 'varchar':
      if (col.character_maximum_length) return `varchar(${col.character_maximum_length})`;
      return 'varchar';
    case 'bpchar':
      if (col.character_maximum_length) return `char(${col.character_maximum_length})`;
      return 'char';
    case 'bytea': return 'bytea';
    case 'inet': return 'inet';
    case 'interval': return 'interval';
    case 'vector': return 'extensions.vector';
    default: return udt;
  }
}
