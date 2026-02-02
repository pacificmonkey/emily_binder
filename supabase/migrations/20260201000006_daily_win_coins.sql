-- Migration 006: Daily Win Coins Bonus Objective
-- Emily Mission Log
--
-- Awards 5 coins when daily win threshold is reached.
-- Uses existing bonus_completions table with UNIQUE constraint to prevent double-awarding.

-- =============================================================================
-- ADD DAILY WIN COINS BONUS OBJECTIVE
-- =============================================================================

INSERT INTO bonus_objectives (name, description, vp_value, objective_type, max_per_day, icon, sort_order)
VALUES (
  'Daily Win Coins',
  'Earn 5 coins when you reach your daily win threshold',
  0,  -- No VP, just coins
  'daily_win_coins',
  1,  -- Once per day max
  '🪙',
  4   -- After existing bonus objectives
);
