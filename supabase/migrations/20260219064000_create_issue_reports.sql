create table if not exists public.issue_reports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    reported_by uuid references auth.users,
    user_email text,
    user_name text,
    description text not null,
    severity text default 'medium',
    category text default 'general',
    status text default 'new',
    screenshot_url text,
    attachments jsonb default '[]'::jsonb,
    console_logs text,
    additional_context text,
    page_url text,
    browser_info jsonb,
    resolved_at timestamp with time zone,
    resolved_by uuid references auth.users,
    admin_notes text,
    admin_response text,
    responded_at timestamp with time zone,
    responded_by uuid references auth.users,
    user_verified boolean default false,
    needs_user_attention boolean default false,
    verification_requested_at timestamp with time zone
);

-- Enable RLS
alter table public.issue_reports enable row level security;

-- Policies
create policy "Users can insert their own issues"
    on public.issue_reports for insert
    to authenticated
    with check (auth.uid() = reported_by);

create policy "Users can view their own issues"
    on public.issue_reports for select
    to authenticated
    using (auth.uid() = reported_by);

create policy "Admins (Service Role) can do everything"
    on public.issue_reports
    to service_role
    using (true)
    with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.issue_reports;
