-- ============================================================================
-- Migration: 00039_seed_gamification_data.sql
-- Description: Seed data for testing gamification features (2 weeks of simulated usage)
-- ============================================================================

-- This seed script adds:
-- 1. Store items (stickers, grace tokens, rewards)
-- 2. Coin ledger entries (simulating streak rewards over 2 weeks)
-- 3. Streak definitions
-- 4. Some purchases and inventory
-- 5. Some placed stickers

DO $$
DECLARE
  v_workspace_id UUID;
  v_patient_id UUID;
  v_user_id UUID;
  v_sticker1_id UUID;
  v_sticker2_id UUID;
  v_sticker3_id UUID;
  v_sticker4_id UUID;
  v_sticker5_id UUID;
  v_sticker6_id UUID;
  v_grace_token_id UUID;
  v_reward1_id UUID;
  v_streak1_id UUID;
  v_streak2_id UUID;
  v_streak3_id UUID;
  v_streak_state1_id UUID;
  v_streak_state2_id UUID;
  v_streak_state3_id UUID;
  v_purchase_id UUID;
BEGIN
  -- Get the first active workspace and patient
  SELECT wm.workspace_id, wm.user_id, pp.patient_id
  INTO v_workspace_id, v_user_id, v_patient_id
  FROM workspace_membership wm
  JOIN patient_profile pp ON pp.workspace_id = wm.workspace_id AND pp.patient_id = wm.user_id
  WHERE wm.status = 'active'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE NOTICE 'No active workspace found, skipping seed data';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding gamification data for workspace % and patient %', v_workspace_id, v_patient_id;

  -- ============================================================================
  -- 1. CREATE STORE ITEMS (Stickers)
  -- ============================================================================

  -- Sticker 1: Rainbow Star
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Rainbow Star', 'A colorful star to brighten your day!', true, 10, 'cosmetic', '{"asset_key": "⭐"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker1_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker1_id, '⭐', 1.0, ARRAY['star', 'colorful']);

  -- Sticker 2: Happy Sun
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Happy Sun', 'Bring some sunshine to your wall!', true, 15, 'cosmetic', '{"asset_key": "🌞"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker2_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker2_id, '🌞', 1.2, ARRAY['sun', 'happy', 'weather']);

  -- Sticker 3: Purple Heart
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Purple Heart', 'Show some love!', true, 10, 'cosmetic', '{"asset_key": "💜"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker3_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker3_id, '💜', 1.0, ARRAY['heart', 'love', 'purple']);

  -- Sticker 4: Sparkles
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Sparkles', 'Add some magic!', true, 20, 'cosmetic', '{"asset_key": "✨"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker4_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker4_id, '✨', 0.8, ARRAY['sparkle', 'magic']);

  -- Sticker 5: Rainbow
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Rainbow', 'A beautiful rainbow!', true, 25, 'cosmetic', '{"asset_key": "🌈"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker5_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker5_id, '🌈', 1.5, ARRAY['rainbow', 'colorful', 'weather']);

  -- Sticker 6: Butterfly
  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'sticker', 'Butterfly', 'A graceful butterfly', true, 15, 'cosmetic', '{"asset_key": "🦋"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_sticker6_id;

  INSERT INTO sticker (store_item_id, asset_key, default_scale, tags)
  VALUES (v_sticker6_id, '🦋', 1.0, ARRAY['butterfly', 'nature', 'animal']);

  -- ============================================================================
  -- 2. CREATE STORE ITEMS (Grace Token)
  -- ============================================================================

  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, max_purchases_per_month, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'consumable_token', 'Grace Token', 'Use to protect a broken streak! Limited to 3 per month.', true, 50, 'consumable', 3, '{"token_key": "grace_token"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_grace_token_id;

  -- ============================================================================
  -- 3. CREATE STORE ITEMS (Real World Reward)
  -- ============================================================================

  INSERT INTO store_item (store_item_id, workspace_id, patient_id, type, name, description, enabled, coin_cost, inventory_kind, max_purchases_total, metadata, created_by_user_id)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, 'real_world_reward', 'Movie Night', 'Pick a movie for family movie night!', true, 100, 'entitlement', 4, '{"reward_type": "experience", "instructions": "Choose any movie for the next family movie night!"}'::jsonb, v_user_id)
  RETURNING store_item_id INTO v_reward1_id;

  -- ============================================================================
  -- 4. CREATE STREAK DEFINITIONS
  -- ============================================================================

  -- Streak 1: Daily Tasks (complete at least 3 tasks daily)
  INSERT INTO streak_definition (streak_definition_id, workspace_id, patient_id, name, status, template_key, period, count_threshold, coin_reward, bonus_milestones, break_behavior, shield_token_item_id, auto_use_token, max_token_uses_per_month, timezone, created_by_user_id)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_patient_id,
    'Daily Tasks', 'active', 'complete_n_filtered', 'daily',
    3, 5,
    '[{"days": 7, "coins": 20}, {"days": 14, "coins": 50}, {"days": 30, "coins": 100}]'::jsonb,
    'use_token_if_available', v_grace_token_id, true, 3,
    'America/Los_Angeles', v_user_id
  )
  RETURNING streak_definition_id INTO v_streak1_id;

  -- Streak 2: Perfect Must-Do (complete all must-do tasks)
  INSERT INTO streak_definition (streak_definition_id, workspace_id, patient_id, name, status, template_key, period, coin_reward, bonus_milestones, break_behavior, shield_token_item_id, auto_use_token, max_token_uses_per_month, timezone, created_by_user_id)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_patient_id,
    'Perfect Day', 'active', 'perfect_must_do', 'daily',
    10,
    '[{"days": 5, "coins": 25}, {"days": 10, "coins": 75}]'::jsonb,
    'prompt_to_use_token', v_grace_token_id, false, 2,
    'America/Los_Angeles', v_user_id
  )
  RETURNING streak_definition_id INTO v_streak2_id;

  -- Streak 3: Weekly Warrior (complete any task each week)
  INSERT INTO streak_definition (streak_definition_id, workspace_id, patient_id, name, status, template_key, period, coin_reward, bonus_milestones, break_behavior, timezone, created_by_user_id)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_patient_id,
    'Weekly Warrior', 'active', 'complete_any_filtered', 'weekly',
    15,
    '[{"days": 4, "coins": 30}]'::jsonb,
    'break',
    'America/Los_Angeles', v_user_id
  )
  RETURNING streak_definition_id INTO v_streak3_id;

  -- ============================================================================
  -- 5. CREATE STREAK STATES (Simulating 2 weeks of progress)
  -- ============================================================================

  -- Streak 1 State: 12 day streak (doing well!)
  INSERT INTO streak_state (streak_state_id, workspace_id, streak_definition_id, patient_id, status, current_count, best_count, current_period_key, period_satisfied, last_incremented_at, tokens_used_this_month)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_streak1_id, v_patient_id,
    'ongoing', 12, 12, to_char(now() AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD'),
    true, now() - interval '6 hours', 0
  )
  RETURNING streak_state_id INTO v_streak_state1_id;

  -- Streak 2 State: 5 day streak (hit first milestone!)
  INSERT INTO streak_state (streak_state_id, workspace_id, streak_definition_id, patient_id, status, current_count, best_count, current_period_key, period_satisfied, last_incremented_at, tokens_used_this_month)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_streak2_id, v_patient_id,
    'ongoing', 5, 8, to_char(now() AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD'),
    false, now() - interval '1 day', 1
  )
  RETURNING streak_state_id INTO v_streak_state2_id;

  -- Streak 3 State: 2 week streak
  INSERT INTO streak_state (streak_state_id, workspace_id, streak_definition_id, patient_id, status, current_count, best_count, current_period_key, period_satisfied, last_incremented_at, tokens_used_this_month)
  VALUES (
    gen_random_uuid(), v_workspace_id, v_streak3_id, v_patient_id,
    'ongoing', 2, 2, to_char(now() AT TIME ZONE 'America/Los_Angeles', 'IYYY-"W"IW'),
    true, now() - interval '2 days', 0
  )
  RETURNING streak_state_id INTO v_streak_state3_id;

  -- ============================================================================
  -- 6. ADD COIN LEDGER ENTRIES (Simulating earnings over 2 weeks)
  -- ============================================================================

  -- Day 1: Started streaks
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '13 days', 'Daily Tasks streak day 1');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '13 days', 'Perfect Day streak day 1');

  -- Days 2-6: Daily rewards
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '12 days', 'Daily Tasks streak day 2');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '12 days', 'Perfect Day streak day 2');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '11 days', 'Daily Tasks streak day 3');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '11 days', 'Perfect Day streak day 3');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '10 days', 'Daily Tasks streak day 4');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '10 days', 'Perfect Day streak day 4');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '9 days', 'Daily Tasks streak day 5');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '9 days', 'Perfect Day streak day 5');

  -- Day 5: Perfect Day 5-day milestone bonus!
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 25, 'streak_milestone', 'streak_state', v_streak_state2_id, now() - interval '9 days', '5 day streak milestone: Perfect Day');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '8 days', 'Daily Tasks streak day 6');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '8 days', 'Perfect Day streak day 6');

  -- Day 7: Weekly Warrior first week + Daily Tasks 7-day milestone!
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '7 days', 'Daily Tasks streak day 7');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 20, 'streak_milestone', 'streak_state', v_streak_state1_id, now() - interval '7 days', '7 day streak milestone: Daily Tasks');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '7 days', 'Perfect Day streak day 7');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 15, 'streak_reward', 'streak_state', v_streak_state3_id, now() - interval '7 days', 'Weekly Warrior week 1');

  -- Days 8-12: More daily rewards
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '6 days', 'Daily Tasks streak day 8');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '6 days', 'Perfect Day streak day 8');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '5 days', 'Daily Tasks streak day 9');
  -- Perfect Day broke on day 9, used a grace token

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '4 days', 'Daily Tasks streak day 10');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '4 days', 'Perfect Day streak (shielded, restarted) day 1');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '3 days', 'Daily Tasks streak day 11');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '3 days', 'Perfect Day streak day 2');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '2 days', 'Daily Tasks streak day 12');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '2 days', 'Perfect Day streak day 3');

  -- Week 2 weekly warrior
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 15, 'streak_reward', 'streak_state', v_streak_state3_id, now() - interval '1 day', 'Weekly Warrior week 2');

  -- Yesterday and today
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '1 day', 'Daily Tasks streak day 13');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '1 day', 'Perfect Day streak day 4');

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 5, 'streak_reward', 'streak_state', v_streak_state1_id, now() - interval '6 hours', 'Daily Tasks streak day 14 (today)');
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 10, 'streak_reward', 'streak_state', v_streak_state2_id, now() - interval '6 hours', 'Perfect Day streak day 5');

  -- Day 14: Daily Tasks 14-day milestone!
  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, 50, 'streak_milestone', 'streak_state', v_streak_state1_id, now() - interval '6 hours', '14 day streak milestone: Daily Tasks');

  -- ============================================================================
  -- 7. SIMULATE PURCHASES
  -- ============================================================================

  -- Bought a Rainbow Star (10 coins)
  INSERT INTO purchase (purchase_id, workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status, purchased_at)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, v_sticker1_id, 1, 10, 'completed', now() - interval '10 days')
  RETURNING purchase_id INTO v_purchase_id;

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, -10, 'purchase', 'purchase', v_purchase_id, now() - interval '10 days', 'Purchased: Rainbow Star');

  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity, acquired_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker1_id, 'cosmetic', 1, now() - interval '10 days');

  -- Bought Purple Hearts x2 (20 coins)
  INSERT INTO purchase (purchase_id, workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status, purchased_at)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, v_sticker3_id, 2, 20, 'completed', now() - interval '8 days')
  RETURNING purchase_id INTO v_purchase_id;

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, -20, 'purchase', 'purchase', v_purchase_id, now() - interval '8 days', 'Purchased: Purple Heart x2');

  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity, acquired_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker3_id, 'cosmetic', 2, now() - interval '8 days');

  -- Bought a Grace Token (50 coins) - used it on day 9 to shield Perfect Day streak
  INSERT INTO purchase (purchase_id, workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status, purchased_at)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, v_grace_token_id, 1, 50, 'completed', now() - interval '6 days')
  RETURNING purchase_id INTO v_purchase_id;

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, -50, 'purchase', 'purchase', v_purchase_id, now() - interval '6 days', 'Purchased: Grace Token');

  -- Grace token was used, so quantity is 0
  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity, acquired_at)
  VALUES (v_workspace_id, v_patient_id, v_grace_token_id, 'consumable', 0, now() - interval '6 days');

  -- Bought Sparkles (20 coins)
  INSERT INTO purchase (purchase_id, workspace_id, patient_id, store_item_id, quantity, coin_cost_total, status, purchased_at)
  VALUES (gen_random_uuid(), v_workspace_id, v_patient_id, v_sticker4_id, 1, 20, 'completed', now() - interval '3 days')
  RETURNING purchase_id INTO v_purchase_id;

  INSERT INTO coin_ledger_entry (workspace_id, patient_id, delta, reason, link_type, link_id, occurred_at, notes)
  VALUES (v_workspace_id, v_patient_id, -20, 'purchase', 'purchase', v_purchase_id, now() - interval '3 days', 'Purchased: Sparkles');

  INSERT INTO user_inventory (workspace_id, patient_id, store_item_id, kind, quantity, acquired_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker4_id, 'cosmetic', 1, now() - interval '3 days');

  -- ============================================================================
  -- 8. PLACE SOME STICKERS ON THE HOME PAGE
  -- ============================================================================

  -- Place the Rainbow Star
  INSERT INTO home_decoration (workspace_id, patient_id, store_item_id, status, position, rotation, scale, z_index, placed_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker1_id, 'active', '{"x": 0.15, "y": 0.25}'::jsonb, 15, 1.2, 1, now() - interval '9 days');

  -- Place one Purple Heart
  INSERT INTO home_decoration (workspace_id, patient_id, store_item_id, status, position, rotation, scale, z_index, placed_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker3_id, 'active', '{"x": 0.85, "y": 0.15}'::jsonb, -10, 1.0, 2, now() - interval '7 days');

  -- Place Sparkles
  INSERT INTO home_decoration (workspace_id, patient_id, store_item_id, status, position, rotation, scale, z_index, placed_at)
  VALUES (v_workspace_id, v_patient_id, v_sticker4_id, 'active', '{"x": 0.5, "y": 0.1}'::jsonb, 0, 1.5, 3, now() - interval '2 days');

  RAISE NOTICE 'Gamification seed data created successfully!';
  RAISE NOTICE 'Current coin balance should be around 215 coins';
  RAISE NOTICE 'Owned stickers: Rainbow Star (1, placed), Purple Heart (2, 1 placed), Sparkles (1, placed)';
  RAISE NOTICE 'Active streaks: Daily Tasks (12 days), Perfect Day (5 days), Weekly Warrior (2 weeks)';
END $$;
