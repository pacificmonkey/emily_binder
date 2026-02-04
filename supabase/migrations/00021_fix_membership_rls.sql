-- Migration: 00021_fix_membership_rls.sql
-- Description: Fix infinite recursion in workspace_membership RLS policy
-- Schema Version: 1.3.0

-- The current policy causes infinite recursion because it references workspace_membership
-- in its own check. Fix by allowing users to see their own membership records directly.

-- Drop the problematic policy
DROP POLICY IF EXISTS workspace_membership_select ON workspace_membership;

-- Create a simpler, non-recursive policy
-- Users can see their own membership records
CREATE POLICY workspace_membership_select ON workspace_membership
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Also fix the insert/update policies to avoid recursion
DROP POLICY IF EXISTS workspace_membership_insert ON workspace_membership;
DROP POLICY IF EXISTS workspace_membership_update ON workspace_membership;

-- For insert: only allow if user is admin in that workspace (use direct check)
-- Since we can't easily check admin status without recursion, we'll rely on
-- the onboarding function (SECURITY DEFINER) for initial creation
-- and allow admins to add members via a function later
CREATE POLICY workspace_membership_insert ON workspace_membership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to create their own initial membership (handled by onboarding function)
    -- Or if they're already an admin in that workspace
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = workspace_membership.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );

-- For update: admins can update memberships in their workspace
CREATE POLICY workspace_membership_update ON workspace_membership
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_membership wm
      WHERE wm.workspace_id = workspace_membership.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role_key = 'admin'
        AND wm.status = 'active'
    )
  );
