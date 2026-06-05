-- Blitztext Web: praefix-getrennte Objekte (blitztext_*), damit die App auch in
-- einem geteilten Supabase-Projekt neben anderen Tabellen kollisionsfrei laeuft.
-- Defaults setzt die App selbst (loadSettings + Upsert) - kein auth.users-Trigger.

-- 1) Pro-Nutzer-Einstellungen ------------------------------------------------
create table if not exists public.blitztext_user_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  workflow      text not null default 'transcription',
  language      text not null default 'de',
  tone          text not null default 'neutral',
  emoji_density text not null default 'mittel',
  custom_terms  text[] not null default '{}',
  context       text not null default '',
  updated_at    timestamptz not null default now(),
  constraint bt_workflow_valid check (workflow in ('transcription','textImprover','dampfAblassen','emojiText')),
  constraint bt_tone_valid check (tone in ('formal','neutral','casual')),
  constraint bt_emoji_valid check (emoji_density in ('wenig','mittel','viel'))
);

alter table public.blitztext_user_settings enable row level security;

create policy "bt_settings_select_own" on public.blitztext_user_settings
  for select using (auth.uid() = user_id);
create policy "bt_settings_insert_own" on public.blitztext_user_settings
  for insert with check (auth.uid() = user_id);
create policy "bt_settings_update_own" on public.blitztext_user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Rate-Limit-Zaehler ------------------------------------------------------
-- Kein RLS-Schreibrecht: nur Service-Role (umgeht RLS) schreibt.
create table if not exists public.blitztext_usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table public.blitztext_usage_counters enable row level security;

create policy "bt_usage_select_own" on public.blitztext_usage_counters
  for select using (auth.uid() = user_id);

-- 3) Atomare Verbrauchszaehlung mit Limit-Pruefung ---------------------------
create or replace function public.blitztext_increment_usage(
  p_user_id uuid,
  p_day date,
  p_limit int
)
returns table (allowed boolean, used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.blitztext_usage_counters (user_id, day, count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day)
  do update set count = public.blitztext_usage_counters.count + 1
  returning count into new_count;

  if new_count > p_limit then
    update public.blitztext_usage_counters
      set count = count - 1
      where user_id = p_user_id and day = p_day;
    return query select false, p_limit;
  else
    return query select true, new_count;
  end if;
end;
$$;
