---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Account-Merge / Support Lookup Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pre-launch safety net for tangled accounts. When one human ends up with two Supabase users · most often because Apple "Hide My Email" handed them a relay address on the App Store that differs from the real email they used on the web · support (the founder) must be able to (1) FIND every account that belongs to that human by any identifier they can produce, and (2) MERGE the stray account into the keeper, moving Pro entitlement + study history, without double-claiming an Apple subscription and with an audit trail to undo it. This is the manual "contact us to merge accounts" path that Phase-G decisions 9 + 10 accepted as the fallback for the rare Hide-My-Email split · this tool IS that path.

**Architecture:** Two admin-only `security definer` Postgres RPCs plus one audit table, all in a single migration. `support_find_accounts(p_query text)` fans one freeform string across every identifier (real email, Apple relay email, Apple `original_transaction_id`, Stripe `provider_customer_id`, Supabase `user_id`) and returns candidate users with their entitlement, provider rows, and a study-history summary. `support_merge_accounts(p_source uuid, p_target uuid, p_dry_run boolean)` re-parents `provider_subscriptions` + `quiz_history` from source to target, deep-merges `profiles.metadata`, dedupes Apple subscriptions on `original_transaction_id`, and writes a full before-state snapshot to `merge_log`. Every function gates on `is_admin(auth.uid())` and runs as the admin from the Supabase SQL editor · no client UI ships for launch.

**Tech Stack:** Supabase Postgres (migration + `plpgsql` RPCs, `security definer`), the existing `provider_subscriptions` / `is_pro()` / `user_entitlements` entitlement model (`20260626_provider_subscriptions.sql`), `profiles.metadata` jsonb + `quiz_history`, and the existing `is_admin()` admin gate (`20260506_phase_c_prime.sql`).

---

## Why this is cheap and low-risk right now (read first)

- **Low volume by design.** Hide-My-Email splits are rare; this tool runs a handful of times around launch, not at scale. So a SQL-editor-driven tool is the right altitude · no admin UI, no endpoint, no client wiring.
- **Reads the model that already exists.** `provider_subscriptions`, `is_pro()`, and `user_entitlements` land in `20260626_provider_subscriptions.sql`; `is_admin()` + `profiles.role` already exist (`20260506_phase_c_prime.sql`). This plan adds only one table and two functions · no schema rewrites.
- **Lane:** GATED (touches `supabase/migrations/*`). Feature branch → PR (auto-spins a Supabase branch DB) → run the SQL asserts in the branch DB → squash-merge → apply to prod. The migration MUST carry a tested `-- ROLLBACK:` block (per the ≥ 2026-05-12 gated-lane rule).
- **Dependency:** requires `20260626_provider_subscriptions.sql` to be applied first (this plan reads `provider_subscriptions` and `is_pro()`). If that migration is not yet in the branch DB, apply it before the asserts below.

**Out of scope (deliberately):** a full admin UI · a web page or endpoint to drive merges. SQL-editor-driven is acceptable for launch volume; a tiny admin page is a future stretch and is NOT in this plan. Also out: auto-detection of duplicates (support finds them by hand from a support ticket), and reversing a committed merge programmatically (the `merge_log` snapshot makes a manual un-merge possible · a one-button revert RPC is a later task if volume ever justifies it).

---

## File structure

- Create: `supabase/migrations/20260626_account_merge_support.sql` · `merge_log` table + RLS, `support_find_accounts()` lookup RPC, `support_merge_accounts()` merge RPC with dry-run mode, all admin-gated. Includes a tested `-- ROLLBACK:` block.

(No app code, no endpoint, no client changes. The tool is invoked from the Supabase SQL editor as the admin user.)

---

## Task 1: Audit table + admin-gated lookup RPC

**Files:**
- Create: `supabase/migrations/20260626_account_merge_support.sql`

This is a SQL migration; "tests" are SQL assertions run in the Supabase branch-DB SQL editor (same style as `20260626_provider_subscriptions.sql`'s verify block). No app code changes.

- [ ] **Step 1: Write the audit table + lookup RPC**

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- Account-merge / support lookup tool
-- Date: 2026-06-26
-- The manual "contact us to merge accounts" path for the rare Apple
-- Hide-My-Email split (Phase-G decisions 9 + 10). Admin-only, SQL-editor-driven.
-- Depends on: 20260626_provider_subscriptions.sql (provider_subscriptions, is_pro,
--             user_entitlements) and 20260506_phase_c_prime.sql (is_admin, profiles.role).
-- Idempotent (IF NOT EXISTS / OR REPLACE).
-- ══════════════════════════════════════════════════════════════════════════

-- 1. merge_log — append-only audit of every merge (and dry-run), with a full
--    before-state snapshot so a merge is reversible-ish by hand.
create table if not exists merge_log (
  id uuid primary key default gen_random_uuid(),
  source_user_id uuid not null,           -- the account being emptied (no FK: source may be deleted later)
  target_user_id uuid not null,           -- the keeper
  performed_by uuid not null,             -- auth.uid() of the admin who ran it
  dry_run boolean not null default false, -- true = nothing was written
  moved jsonb not null default '{}'::jsonb,-- counts: {provider_subscriptions, quiz_history, metadata_keys, skipped_apple_dupes}
  source_snapshot jsonb,                  -- full prior state of source (entitlement + history ids + metadata) for un-merge
  target_snapshot jsonb,                  -- target metadata prior to merge (so a key-collision can be reversed)
  note text,
  created_at timestamptz not null default now()
);

comment on table merge_log is
  'Append-only audit of support_merge_accounts runs (including dry-runs). source_snapshot captures the prior state so a committed merge can be reversed by hand. Admin-readable only.';

create index if not exists idx_merge_log_source on merge_log(source_user_id);
create index if not exists idx_merge_log_target on merge_log(target_user_id);

-- RLS: admin-only read. No client writes (the RPC, running security definer, is the only writer).
alter table merge_log enable row level security;
drop policy if exists "merge_log_admin_read" on merge_log;
create policy "merge_log_admin_read" on merge_log
  for select using (public.is_admin());

-- 2. support_find_accounts(p_query) — one freeform string, matched across every
--    identifier a human might give support. Returns one row per candidate user
--    with entitlement + provider rows + a study-history summary.
create or replace function support_find_accounts(p_query text)
returns table (
  user_id uuid,
  email text,
  role text,
  is_pro boolean,
  providers text[],
  best_period_end timestamptz,
  provider_rows jsonb,
  quiz_count bigint,
  last_quiz_at timestamptz,
  metadata_keys text[],
  matched_on text
) language plpgsql security definer set search_path = public stable as $$
declare
  v_q   text := trim(coalesce(p_query, ''));
  v_uid uuid := case when v_q ~ '^[0-9a-fA-F-]{36}$' then v_q::uuid else null end;
begin
  if not public.is_admin() then
    raise exception 'support_find_accounts: admin only';
  end if;
  if v_q = '' then
    return;  -- empty query → no rows
  end if;

  return query
  with matches as (
    -- (a) Supabase user_id (exact uuid)
    select u.id as user_id, 'user_id' as matched_on
      from auth.users u
     where v_uid is not null and u.id = v_uid
    union
    -- (b) real email OR Apple relay email (auth.users.email is the relay address
    --     Apple handed us; the real email may live there too · match either, ci)
    select u.id, 'email'
      from auth.users u
     where u.email ilike v_q
    union
    -- (c) profiles.email (mirror of auth email; matched separately for safety)
    select p.id, 'profile_email'
      from profiles p
     where p.email ilike v_q
    union
    -- (d) Stripe customer id (cus_…)
    select ps.user_id, 'stripe_customer_id'
      from provider_subscriptions ps
     where ps.provider_customer_id = v_q
    union
    -- (e) Apple original_transaction_id (stable across renewals)
    select ps.user_id, 'apple_original_transaction_id'
      from provider_subscriptions ps
     where ps.original_transaction_id = v_q
    union
    -- (f) any provider_subscription_id (sub_… or Apple current txn id)
    select ps.user_id, 'provider_subscription_id'
      from provider_subscriptions ps
     where ps.provider_subscription_id = v_q
  ),
  distinct_matches as (
    -- one row per user; keep the first matched_on reason deterministically
    select m.user_id, min(m.matched_on) as matched_on
      from matches m
     group by m.user_id
  )
  select
    dm.user_id,
    u.email,
    p.role,
    coalesce(ue.is_pro, false)                                   as is_pro,
    coalesce(ue.providers, array[]::text[])                      as providers,
    ue.best_period_end,
    coalesce(
      (select jsonb_agg(to_jsonb(ps2) order by ps2.updated_at desc)
         from provider_subscriptions ps2 where ps2.user_id = dm.user_id),
      '[]'::jsonb)                                               as provider_rows,
    (select count(*) from quiz_history qh where qh.user_id = dm.user_id) as quiz_count,
    (select max(qh.created_at) from quiz_history qh where qh.user_id = dm.user_id) as last_quiz_at,
    case when p.metadata is null then array[]::text[]
         else array(select jsonb_object_keys(p.metadata)) end   as metadata_keys,
    dm.matched_on
  from distinct_matches dm
  join auth.users u on u.id = dm.user_id
  left join profiles p on p.id = dm.user_id
  left join user_entitlements ue on ue.user_id = dm.user_id
  order by is_pro desc, last_quiz_at desc nulls last;
end;
$$;

comment on function support_find_accounts is
  'Admin-only. Finds candidate accounts for one human by any of: real/relay email, Apple original_transaction_id, Stripe provider_customer_id, provider_subscription_id, or Supabase user_id. Returns entitlement + provider rows + study-history summary. Read-only.';
```

> NOTE on `quiz_history.created_at`: the column is the append timestamp per CLAUDE.md ("quiz HISTORY stays in the dedicated quiz_history table (append-only)"). If the live `quiz_history` schema names that column differently (e.g. `taken_at` / `completed_at`), adjust the two `qh.created_at` references in this RPC and the `last_quiz_at` assert below to the real column name · confirm against the initial schema migration before applying. No other change is needed.

- [ ] **Step 2: Apply on the branch DB and verify lookup**

Apply `20260626_provider_subscriptions.sql` first (dependency), then this migration. Then build two fake accounts representing a Hide-My-Email split and prove every identifier finds them:

```sql
-- Two fake users: real-email web account (target) + Apple-relay account (source).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'jane.real@gmail.com'),
  ('22222222-2222-2222-2222-222222222222', 'abc123xyz@privaterelay.appleid.com')
on conflict (id) do nothing;
insert into profiles (id, email, role, metadata) values
  ('11111111-1111-1111-1111-111111111111', 'jane.real@gmail.com', 'user',
     '{"streak":{"current":5,"best":5},"daily_goal":50}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'abc123xyz@privaterelay.appleid.com', 'user',
     '{"streak":{"current":12,"best":18},"wrong_bank":[101,102]}'::jsonb)
on conflict (id) do update set metadata = excluded.metadata, email = excluded.email;
-- Apple Pro lives on the relay (source) account; web (target) is free.
insert into provider_subscriptions
  (user_id, provider, original_transaction_id, provider_subscription_id, tier, status, current_period_end)
values
  ('22222222-2222-2222-2222-222222222222', 'apple', 'apl_orig_txn_999', 'apl_txn_now',
   'pro', 'active', now() + interval '300 days')
on conflict do nothing;

-- Make the caller admin for the test (RPCs gate on is_admin()).
update profiles set role = 'admin' where id = auth.uid();

-- Each identifier resolves to the right account:
select user_id, matched_on, is_pro from support_find_accounts('jane.real@gmail.com');               -- target, user_id/email, is_pro=false
select user_id, matched_on, is_pro from support_find_accounts('abc123xyz@privaterelay.appleid.com');-- source, email, is_pro=true
select user_id, matched_on from support_find_accounts('apl_orig_txn_999');                          -- source, apple_original_transaction_id
select user_id, matched_on from support_find_accounts('22222222-2222-2222-2222-222222222222');      -- source, user_id
select quiz_count, metadata_keys from support_find_accounts('abc123xyz@privaterelay.appleid.com');  -- 0, {streak,wrong_bank}
select * from support_find_accounts('');                                                            -- 0 rows
```

Expected: each lookup returns the commented account. The relay-email lookup must show `is_pro = true` (Apple sub on the source) and the real-email lookup `is_pro = false` · that is exactly the tangle this tool exists to fix.

- [ ] **Step 3: Prove the admin gate**

```sql
-- Demote, confirm the RPC refuses, re-promote.
update profiles set role = 'user' where id = auth.uid();
select support_find_accounts('jane.real@gmail.com');   -- ERROR: support_find_accounts: admin only
update profiles set role = 'admin' where id = auth.uid();
```

Expected: the demoted call raises `admin only`; re-promoted it works again.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260626_account_merge_support.sql
git commit -m "feat(support): merge_log audit table + admin-gated support_find_accounts() lookup RPC"
```

---

## Task 2: Admin-gated merge RPC with dry-run + Apple dedupe + audit

**Files:**
- Modify: `supabase/migrations/20260626_account_merge_support.sql` (append the merge RPC · keep it in the same migration so the table + both functions ship together)

- [ ] **Step 1: Append the merge RPC above the `-- ROLLBACK:` block**

```sql
-- 3. support_merge_accounts(p_source, p_target, p_dry_run) — move entitlement +
--    study history from SOURCE into TARGET. Dedupes Apple subs on
--    original_transaction_id (never let two users claim the same Apple sub).
--    Snapshots prior state into merge_log so the merge is reversible by hand.
--    Dry-run (default TRUE) computes + records what WOULD move, writes nothing else.
create or replace function support_merge_accounts(
  p_source  uuid,
  p_target  uuid,
  p_dry_run boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_moved          jsonb;
  v_src_snapshot   jsonb;
  v_tgt_snapshot   jsonb;
  v_src_meta       jsonb;
  v_tgt_meta       jsonb;
  v_merged_meta    jsonb;
  v_prov_to_move   int := 0;
  v_apple_dupes    int := 0;
  v_quiz_to_move   int := 0;
  v_meta_keys      int := 0;
  v_log_id         uuid;
begin
  -- (a) gate + sanity
  if not public.is_admin() then
    raise exception 'support_merge_accounts: admin only';
  end if;
  if p_source is null or p_target is null then
    raise exception 'support_merge_accounts: source and target are required';
  end if;
  if p_source = p_target then
    raise exception 'support_merge_accounts: source and target must differ';
  end if;
  if not exists (select 1 from auth.users where id = p_source) then
    raise exception 'support_merge_accounts: source % does not exist', p_source;
  end if;
  if not exists (select 1 from auth.users where id = p_target) then
    raise exception 'support_merge_accounts: target % does not exist', p_target;
  end if;

  -- (b) snapshot prior state (always · powers the audit + a hand un-merge)
  v_src_snapshot := jsonb_build_object(
    'provider_subscriptions',
      coalesce((select jsonb_agg(to_jsonb(ps)) from provider_subscriptions ps where ps.user_id = p_source), '[]'::jsonb),
    'quiz_history_ids',
      coalesce((select jsonb_agg(qh.id) from quiz_history qh where qh.user_id = p_source), '[]'::jsonb),
    'metadata', (select metadata from profiles where id = p_source)
  );
  v_tgt_meta := coalesce((select metadata from profiles where id = p_target), '{}'::jsonb);
  v_src_meta := coalesce((select metadata from profiles where id = p_source), '{}'::jsonb);
  v_tgt_snapshot := jsonb_build_object('metadata', v_tgt_meta);

  -- (c) Apple dedupe: a source Apple sub whose original_transaction_id already
  --     exists on the target is a duplicate · skip it (do NOT move), count it.
  select count(*) into v_apple_dupes
    from provider_subscriptions s
   where s.user_id = p_source and s.provider = 'apple'
     and s.original_transaction_id is not null
     and exists (
       select 1 from provider_subscriptions t
        where t.user_id = p_target and t.provider = 'apple'
          and t.original_transaction_id = s.original_transaction_id);

  -- provider rows that WILL move = all source rows minus the Apple dupes
  select count(*) into v_prov_to_move
    from provider_subscriptions s
   where s.user_id = p_source
     and not (s.provider = 'apple' and s.original_transaction_id is not null
              and exists (select 1 from provider_subscriptions t
                           where t.user_id = p_target and t.provider = 'apple'
                             and t.original_transaction_id = s.original_transaction_id));

  select count(*) into v_quiz_to_move from quiz_history where user_id = p_source;

  -- (d) deep-merge metadata: target wins on scalar key collisions; numeric
  --     "best"-style streak fields take the max; source-only keys are added.
  --     (target-wins keeps the keeper's chosen settings; we only ADD what the
  --     source uniquely had, plus lift the better streak.)
  v_merged_meta := v_src_meta || v_tgt_meta;  -- right side (target) wins on collision
  -- lift the better streak.best / streak.current if source had a higher one
  if (v_src_meta #>> '{streak,best}') is not null then
    v_merged_meta := jsonb_set(v_merged_meta, '{streak,best}',
      to_jsonb(greatest(
        coalesce((v_src_meta #>> '{streak,best}')::numeric, 0),
        coalesce((v_tgt_meta #>> '{streak,best}')::numeric, 0))), true);
  end if;
  select count(*) into v_meta_keys
    from (select jsonb_object_keys(v_src_meta) except select jsonb_object_keys(v_tgt_meta)) k;

  v_moved := jsonb_build_object(
    'provider_subscriptions', v_prov_to_move,
    'quiz_history',           v_quiz_to_move,
    'metadata_keys_added',    v_meta_keys,
    'skipped_apple_dupes',    v_apple_dupes
  );

  -- (e) write the audit row FIRST (so even a dry-run is recorded)
  insert into merge_log (source_user_id, target_user_id, performed_by, dry_run,
                         moved, source_snapshot, target_snapshot, note)
  values (p_source, p_target, auth.uid(), p_dry_run, v_moved, v_src_snapshot, v_tgt_snapshot,
          case when p_dry_run then 'dry-run' else 'committed' end)
  returning id into v_log_id;

  -- (f) dry-run stops here · nothing else written
  if p_dry_run then
    return jsonb_build_object('dry_run', true, 'merge_log_id', v_log_id, 'would_move', v_moved);
  end if;

  -- (g) COMMIT path · re-parent the data.
  -- g1. delete the duplicate Apple source rows (target already has them)
  delete from provider_subscriptions s
   where s.user_id = p_source and s.provider = 'apple'
     and s.original_transaction_id is not null
     and exists (select 1 from provider_subscriptions t
                  where t.user_id = p_target and t.provider = 'apple'
                    and t.original_transaction_id = s.original_transaction_id);
  -- g2. re-parent the remaining provider rows to the target
  update provider_subscriptions set user_id = p_target, updated_at = now()
   where user_id = p_source;
  -- g3. re-parent study history
  update quiz_history set user_id = p_target where user_id = p_source;
  -- g4. write the merged metadata onto the target
  update profiles set metadata = v_merged_meta, updated_at = now() where id = p_target;
  -- g5. blank the source metadata so it cannot resurrect stale state if reused
  update profiles set metadata = '{}'::jsonb, updated_at = now() where id = p_source;

  return jsonb_build_object('dry_run', false, 'merge_log_id', v_log_id, 'moved', v_moved);
end;
$$;

comment on function support_merge_accounts is
  'Admin-only. Moves provider_subscriptions + quiz_history + profiles.metadata from p_source into p_target. Dedupes Apple subs on original_transaction_id. Snapshots prior state to merge_log. p_dry_run defaults TRUE · run it first to see what WOULD move, then re-run with FALSE to commit.';
```

> NOTE on uniqueness safety: `provider_subscriptions` carries partial unique indexes `uq_provsub_stripe(provider, provider_subscription_id)` and `uq_provsub_apple(provider, original_transaction_id)` (from `20260626_provider_subscriptions.sql`). The Apple dedupe in step (c)/(g1) is what keeps step (g2)'s `update … set user_id = p_target` from colliding with `uq_provsub_apple` when both accounts hold the SAME Apple sub. A Stripe collision (same `sub_…` on two users) cannot happen · Stripe never issues one subscription id to two customers · so no Stripe-side dedupe is needed.

- [ ] **Step 2: Re-apply the migration and prove the merge (dry-run → commit → audit)**

Re-run the full migration file (idempotent), re-create the two fake accounts from Task 1 Step 2 if the branch DB was reset, then:

```sql
-- DRY-RUN first: nothing moves, but an audit row is written and the plan returned.
select support_merge_accounts(
  '22222222-2222-2222-2222-222222222222',   -- source (Apple-relay, holds Pro)
  '11111111-1111-1111-1111-111111111111',   -- target (real-email keeper)
  true);                                     -- p_dry_run
-- → {"dry_run":true,"would_move":{"provider_subscriptions":1,"quiz_history":0,
--    "metadata_keys_added":1,"skipped_apple_dupes":0}, ...}
select is_pro('11111111-1111-1111-1111-111111111111');   -- still FALSE (dry-run moved nothing)
select dry_run, moved from merge_log order by created_at desc limit 1;  -- dry_run=true, counts above

-- COMMIT: move everything.
select support_merge_accounts(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  false);                                    -- → {"dry_run":false,"moved":{...}}

-- Entitlement followed the human to the keeper:
select is_pro('11111111-1111-1111-1111-111111111111');   -- TRUE  (Apple Pro now on target)
select is_pro('22222222-2222-2222-2222-222222222222');   -- FALSE (source emptied)
select count(*) from provider_subscriptions where user_id = '22222222-2222-2222-2222-222222222222'; -- 0
select count(*) from provider_subscriptions where user_id = '11111111-1111-1111-1111-111111111111'; -- 1
-- Source-only metadata key landed on the target; better streak lifted:
select metadata ? 'wrong_bank' as has_wrong_bank,
       metadata #>> '{streak,best}' as streak_best
  from profiles where id = '11111111-1111-1111-1111-111111111111';            -- true, 18
-- Audit row records the committed move + a restorable source snapshot:
select dry_run, moved, (source_snapshot -> 'provider_subscriptions') as snap
  from merge_log order by created_at desc limit 1;                            -- dry_run=false, snap has 1 Apple row
```

Expected: the dry-run flips nothing (`is_pro` target still false) yet writes an audit row; the commit moves the Apple sub so `is_pro` flips TRUE on the target and FALSE on the source; `wrong_bank` (source-only) appears on the target; `streak.best` lifts to 18; and `merge_log` holds the source snapshot needed to un-merge by hand.

- [ ] **Step 3: Prove the Apple-dedupe guard (no double-claim)**

```sql
-- Give the TARGET the same Apple original_transaction_id the source holds,
-- then merge · the duplicate must be SKIPPED, not moved (would otherwise
-- violate uq_provsub_apple).
-- (reset the two fake users first, then:)
insert into provider_subscriptions
  (user_id, provider, original_transaction_id, provider_subscription_id, tier, status, current_period_end)
values
  ('22222222-2222-2222-2222-222222222222','apple','apl_orig_DUP','apl_txn_src','pro','active', now()+interval '200 days'),
  ('11111111-1111-1111-1111-111111111111','apple','apl_orig_DUP','apl_txn_tgt','pro','active', now()+interval '200 days')
on conflict do nothing;
select support_merge_accounts(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  false);  -- → moved.skipped_apple_dupes = 1, provider_subscriptions moved = 0
-- target still has exactly ONE row for that txn (the dupe was skipped, not duplicated):
select count(*) from provider_subscriptions
 where original_transaction_id = 'apl_orig_DUP' and user_id = '11111111-1111-1111-1111-111111111111'; -- 1
-- source's duplicate Apple row is gone:
select count(*) from provider_subscriptions where user_id = '22222222-2222-2222-2222-222222222222';   -- 0

-- cleanup
delete from provider_subscriptions where user_id in
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
delete from quiz_history where user_id in
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
delete from merge_log where source_user_id = '22222222-2222-2222-2222-222222222222';
delete from profiles where id in
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
delete from auth.users where id in
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
```

Expected: `skipped_apple_dupes = 1`, the target keeps exactly one row for `apl_orig_DUP`, and the source is emptied · no unique-index violation, no double-claim.

- [ ] **Step 4: Append + verify the ROLLBACK block, then commit**

Add this `-- ROLLBACK:` block at the very end of the migration file and confirm running it drops every object cleanly on the branch DB:

```sql
-- ── ROLLBACK: ──────────────────────────────────────────────────────────────
-- Drops the support tooling. Safe: merge_log is an audit artifact only · no
-- entitlement or study data lives solely in it (the real rows are in
-- provider_subscriptions / quiz_history / profiles). Already-committed merges
-- are NOT undone by this rollback (use the merge_log snapshot to un-merge by
-- hand before rolling back if you need the source restored).
--   drop function if exists support_merge_accounts(uuid, uuid, boolean);
--   drop function if exists support_find_accounts(text);
--   drop table if exists merge_log cascade;
-- ───────────────────────────────────────────────────────────────────────────
```

```bash
git add supabase/migrations/20260626_account_merge_support.sql
git commit -m "feat(support): support_merge_accounts() RPC — dry-run, Apple dedupe, merge_log audit + ROLLBACK"
```

---

## Task 3: Gated-lane ship

- [ ] **Step 1: Full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

Expected: UAT all-pass, tech-debt no new breach. (This change is migration-only · no `APP_VERSION` / cache bump is required since no shipped client asset changes. Skip `bump-version.js`.)

- [ ] **Step 2: PR + branch-DB asserts** — push the feature branch; the PR auto-spins a Supabase branch DB. In its SQL editor, apply `20260626_provider_subscriptions.sql` (if not already) then `20260626_account_merge_support.sql`, and re-run the Task 1 + Task 2 assert blocks (lookup resolves every identifier · dry-run moves nothing but logs · commit flips `is_pro` to the target · Apple dupe skipped · audit row written). Self-sign the PR checklist.

- [ ] **Step 3: Merge → apply to prod** — squash-merge. Apply `20260626_account_merge_support.sql` to the **production** Supabase project (after confirming `20260626_provider_subscriptions.sql` is already applied there). Confirm `support_find_accounts('<your-own-email>')` returns your admin account and `is_admin()` gates a non-admin caller out.

- [ ] **Step 4: Document the runbook** — add a one-line pointer in the support/ops notes: "tangled account → `select * from support_find_accounts('<identifier>');` to locate, then `select support_merge_accounts('<source>','<target>', true);` (dry-run) and re-run with `false` to commit; audit in `merge_log`." No further deploy step · the tool is live the moment the migration is applied.

---

## Self-review

**Spec coverage:** Lookup by every identifier → `support_find_accounts()` matches real email, Apple relay email, Apple `original_transaction_id`, Stripe `provider_customer_id`, `provider_subscription_id`, and Supabase `user_id` (Task 1, verified by the six per-identifier asserts). Merge moves entitlement + study history + metadata → `support_merge_accounts()` re-parents `provider_subscriptions` + `quiz_history` and deep-merges `profiles.metadata` (Task 2, verified by the `is_pro` flip + `wrong_bank`/streak asserts). Audit trail → `merge_log` with source/target/who/when/what-moved + before-state snapshot (verified). Apple double-claim prevented → dedupe on `original_transaction_id` in steps (c)/(g1) (verified by the dedupe guard, `skipped_apple_dupes=1`, no unique-index violation). Dry-run → `p_dry_run` defaults TRUE, records the plan, writes nothing else (verified · target `is_pro` stays false after dry-run). Admin gating → every RPC calls `is_admin()` and raises `admin only` otherwise (verified by the demote/re-promote assert). Safety → tested `-- ROLLBACK:` block; merge reversible-ish via `source_snapshot`. ✅

**Out of scope (deliberately):** full admin UI / web endpoint (SQL-editor-driven is accepted for launch volume per the brief); a one-button programmatic un-merge RPC (the `merge_log` snapshot supports a manual un-merge · automate later only if volume justifies); auto-detection of duplicate accounts (support finds them from the ticket). All stated up front in "Why this is cheap" and reaffirmed here.

**Placeholder scan:** none · every step has real SQL. The one schema-name caveat (`quiz_history.created_at`) is called out in an explicit NOTE with what to change and how to confirm it, not left as a TBD.

**Name consistency:** `merge_log` columns written by `support_merge_accounts` (source_user_id, target_user_id, performed_by, dry_run, moved, source_snapshot, target_snapshot, note) match the `create table` exactly. `support_find_accounts(p_query text)` and `support_merge_accounts(p_source uuid, p_target uuid, p_dry_run boolean)` signatures are identical in their definitions, the asserts, the runbook, and the ROLLBACK `drop function` lines. Reads of `provider_subscriptions` (provider, provider_customer_id, provider_subscription_id, original_transaction_id, user_id), `is_pro()`, `user_entitlements` (user_id, is_pro, providers, best_period_end), `is_admin()`, `profiles.metadata`/`profiles.role`, and `quiz_history.user_id` all match the upstream migrations `20260626_provider_subscriptions.sql` and `20260506_phase_c_prime.sql`. ✅

---

## Dependency note

GATED lane. Inert and un-appliable until `20260626_provider_subscriptions.sql` (the multi-provider entitlement schema) is applied · this plan reads `provider_subscriptions`, `is_pro()`, and `user_entitlements`. Apply that migration first (branch DB and prod), then land this one. `is_admin()` + `profiles.role` already exist (`20260506_phase_c_prime.sql`), so no admin-gate prerequisite remains.
