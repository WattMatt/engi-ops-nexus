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
    const body = await req.json().catch(() => ({}));
    const phase = body.phase || 1; // 1=enums+tables, 2=fks+indexes, 3=functions+triggers, 4=rls+views+realtime

    const sourceDbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!sourceDbUrl) throw new Error('SUPABASE_DB_URL not available');

    const targetUrl = Deno.env.get('TARGET_SUPABASE_URL');
    const targetDbPassword = Deno.env.get('TARGET_DB_PASSWORD');
    if (!targetUrl || !targetDbPassword) throw new Error('Missing target credentials');

    const targetRef = targetUrl.replace('https://', '').split('.')[0];
    const encodedPassword = encodeURIComponent(targetDbPassword);
    const targetDbUrl = `postgresql://postgres:${encodedPassword}@db.${targetRef}.supabase.co:5432/postgres`;

    log(`Phase ${phase}: Connecting...`);
    const source = postgres(sourceDbUrl, { max: 1, idle_timeout: 50 });
    const target = postgres(targetDbUrl, { max: 1, idle_timeout: 50 });

    const testResult = await target`SELECT current_database()`;
    log(`Target connected: ${testResult[0].current_database}`);

    const summary: Record<string, any> = {};

    if (phase === 1) {
      // ENUMS
      log('--- Extracting enums ---');
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
        try {
          await target.unsafe(`DO $$ BEGIN CREATE TYPE public.${en.enum_name} AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
          log(`  Enum: ${en.enum_name}`);
        } catch (e: any) { log(`  Enum err: ${e.message.substring(0, 80)}`); }
      }

      // EXTENSIONS first
      log('--- Enabling extensions ---');
      const extensions = await source`SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql', 'pg_stat_statements')`;
      for (const ext of extensions) {
        try {
          await target.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}" WITH SCHEMA extensions;`);
          log(`  Ext: ${ext.extname}`);
        } catch {
          try { await target.unsafe(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}";`); } catch {}
        }
      }

      // TABLES
      log('--- Creating tables ---');
      const tables = await source`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
      const columns = await source`
        SELECT table_name, column_name, data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale,
               is_nullable, column_default, ordinal_position
        FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position
      `;
      const tableColumns: Record<string, any[]> = {};
      for (const col of columns) {
        if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
        tableColumns[col.table_name].push(col);
      }
      const pks = await source`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      `;
      const pkMap: Record<string, string[]> = {};
      for (const pk of pks) { if (!pkMap[pk.table_name]) pkMap[pk.table_name] = []; pkMap[pk.table_name].push(pk.column_name); }

      const uqs = await source`
        SELECT tc.table_name, tc.constraint_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
        GROUP BY tc.table_name, tc.constraint_name
      `;

      let created = 0, failed = 0;
      for (const table of tables) {
        const tname = table.table_name;
        const cols = tableColumns[tname] || [];
        if (cols.length === 0) continue;
        const colDefs: string[] = [];
        for (const col of cols) {
          let colType = mapDataType(col);
          let def = `"${col.column_name}" ${colType}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default) def += ` DEFAULT ${col.column_default}`;
          colDefs.push(def);
        }
        if (pkMap[tname]) colDefs.push(`PRIMARY KEY (${pkMap[tname].map(c => `"${c}"`).join(', ')})`);
        for (const uq of uqs.filter((u: any) => u.table_name === tname)) {
          colDefs.push(`CONSTRAINT "${uq.constraint_name}" UNIQUE (${uq.columns.split(', ').map((c: string) => `"${c.trim()}"`).join(', ')})`);
        }
        try {
          await target.unsafe(`CREATE TABLE IF NOT EXISTS public."${tname}" (\n  ${colDefs.join(',\n  ')}\n);`);
          created++;
        } catch (e: any) { failed++; log(`  FAIL ${tname}: ${e.message.substring(0, 100)}`); }
      }
      summary.tables = { created, failed, total: tables.length };
      log(`Tables: ${created}/${tables.length} created, ${failed} failed`);

    } else if (phase === 2) {
      // FOREIGN KEYS
      log('--- Adding foreign keys ---');
      const fks = await source`
        SELECT tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_schema AS foreign_table_schema,
               ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name, rc.delete_rule, rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
      `;
      let fkCreated = 0, fkFailed = 0;
      const done = new Set<string>();
      for (const fk of fks) {
        if (done.has(fk.constraint_name)) continue;
        done.add(fk.constraint_name);
        const refSchema = fk.foreign_table_schema || 'public';
        let sql = `ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES ${refSchema}."${fk.foreign_table_name}"("${fk.foreign_column_name}")`;
        if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') sql += ` ON DELETE ${fk.delete_rule}`;
        try { await target.unsafe(sql + ';'); fkCreated++; } catch (e: any) {
          if (!e.message.includes('already exists')) { fkFailed++; if (fkFailed <= 10) log(`  FK fail ${fk.constraint_name}: ${e.message.substring(0, 100)}`); }
        }
      }
      summary.foreignKeys = { created: fkCreated, failed: fkFailed };

      // INDEXES
      log('--- Creating indexes ---');
      const indexes = await source`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey' AND indexdef NOT LIKE '%UNIQUE%'`;
      let idxCreated = 0;
      for (const idx of indexes) {
        try { await target.unsafe(idx.indexdef.replace(/^CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS')); idxCreated++; } catch {}
      }
      summary.indexes = idxCreated;
      log(`FKs: ${fkCreated}, Indexes: ${idxCreated}`);

    } else if (phase === 3) {
      // FUNCTIONS
      log('--- Creating functions ---');
      const functions = await source`
        SELECT pg_get_functiondef(p.oid) as funcdef, p.proname
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f'
      `;
      let funcCreated = 0, funcFailed = 0;
      for (const func of functions) {
        try {
          let sql = func.funcdef;
          if (!sql.includes('CREATE OR REPLACE')) sql = sql.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');
          await target.unsafe(sql);
          funcCreated++;
        } catch (e: any) { funcFailed++; if (funcFailed <= 5) log(`  Func fail ${func.proname}: ${e.message.substring(0, 80)}`); }
      }
      summary.functions = { created: funcCreated, failed: funcFailed };

      // TRIGGERS
      log('--- Creating triggers ---');
      const triggers = await source`
        SELECT tg.tgname as trigger_name, c.relname as table_name, pg_get_triggerdef(tg.oid) as trigger_def
        FROM pg_trigger tg JOIN pg_class c ON tg.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT tg.tgisinternal
      `;
      let trigCreated = 0;
      for (const trig of triggers) {
        try {
          await target.unsafe(`DROP TRIGGER IF EXISTS "${trig.trigger_name}" ON public."${trig.table_name}";`);
          await target.unsafe(trig.trigger_def);
          trigCreated++;
        } catch {}
      }
      summary.triggers = trigCreated;
      log(`Functions: ${funcCreated}, Triggers: ${trigCreated}`);

    } else if (phase === 4) {
      // RLS
      log('--- Setting up RLS ---');
      const rlsTables = await source`
        SELECT relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
      `;
      for (const t of rlsTables) {
        try { await target.unsafe(`ALTER TABLE public."${t.relname}" ENABLE ROW LEVEL SECURITY;`); } catch {}
      }

      const policies = await source`SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`;
      let polCreated = 0, polFailed = 0;
      for (const pol of policies) {
        try {
          const perm = pol.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
          let rolesStr = '';
          if (pol.roles) {
            const r = Array.isArray(pol.roles) ? pol.roles.join(', ') : String(pol.roles).replace(/[{}]/g, '');
            rolesStr = `TO ${r}`;
          }
          let sql = `CREATE POLICY "${pol.policyname}" ON public."${pol.tablename}" AS ${perm} FOR ${pol.cmd} ${rolesStr}`;
          if (pol.qual) sql += ` USING (${pol.qual})`;
          if (pol.with_check) sql += ` WITH CHECK (${pol.with_check})`;
          await target.unsafe(sql + ';');
          polCreated++;
        } catch (e: any) { polFailed++; if (polFailed <= 3) log(`  Pol fail: ${e.message.substring(0, 80)}`); }
      }
      summary.policies = { created: polCreated, failed: polFailed };

      // VIEWS
      log('--- Creating views ---');
      const views = await source`SELECT viewname, definition FROM pg_views WHERE schemaname = 'public'`;
      let viewCreated = 0;
      for (const v of views) {
        try { await target.unsafe(`CREATE OR REPLACE VIEW public."${v.viewname}" AS ${v.definition}`); viewCreated++; } catch (e: any) { log(`  View fail: ${e.message.substring(0, 80)}`); }
      }
      summary.views = viewCreated;

      // REALTIME
      const pubs = await source`SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`;
      for (const pub of pubs) {
        try { await target.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE public."${pub.tablename}";`); } catch {}
      }
      summary.realtime = pubs.length;
      log(`RLS: ${rlsTables.length} tables, Policies: ${polCreated}, Views: ${viewCreated}`);
    }

    await source.end();
    await target.end();

    log(`=== Phase ${phase} complete ===`);
    return new Response(JSON.stringify({ success: true, phase, summary, logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    log(`FATAL: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: error.message, logs }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapDataType(col: any): string {
  const udt = col.udt_name;
  if (col.data_type === 'ARRAY') return udt.replace(/^_/, '') + '[]';
  if (col.data_type === 'USER-DEFINED') return `public.${udt}`;
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
      if (col.numeric_precision && col.numeric_scale) return `numeric(${col.numeric_precision},${col.numeric_scale})`;
      return 'numeric';
    case 'varchar':
      if (col.character_maximum_length) return `varchar(${col.character_maximum_length})`;
      return 'varchar';
    case 'bpchar': return col.character_maximum_length ? `char(${col.character_maximum_length})` : 'char';
    case 'bytea': return 'bytea';
    case 'interval': return 'interval';
    case 'vector': return 'extensions.vector';
    default: return col.data_type || 'text';
  }
}
