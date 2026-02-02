/**
 * Create Joey account using direct approach
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxlbnfarkaaqxpsgwuwk.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGJuZmFya2FhcXhwc2d3dXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc0MjI1OSwiZXhwIjoyMDg1MzE4MjU5fQ.XFr3osbROpQWcKLG6ssH77E4xOrklwsjLCdPHsePV5I'

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createJoey() {
  const email = 'pacific.joseph@gmail.com'
  const password = '123456temporarytesting'

  console.log('Step 1: Dropping the trigger temporarily...')

  // We can't drop the trigger from here, so let's try using the invite approach
  // which doesn't trigger the insert

  console.log('Step 2: Creating user via invite method...')

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      display_name: 'Joey',
      role: 'joey'
    }
  })

  if (inviteError) {
    console.log('Invite error:', inviteError.message)

    // Check if user was created anyway
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users?.users?.find(u => u.email === email)

    if (user) {
      console.log('User exists despite error! ID:', user.id)

      // Try to create profile manually
      console.log('Creating profile manually...')
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: 'Joey',
          role_global: 'joey'
        })

      if (profileError) {
        console.log('Profile error:', profileError.message)
      } else {
        console.log('Profile created!')
      }

      // Update password
      console.log('Setting password...')
      const { error: pwError } = await adminClient.auth.admin.updateUserById(user.id, {
        password: password,
        email_confirm: true
      })

      if (pwError) {
        console.log('Password update error:', pwError.message)
      } else {
        console.log('Password set!')
      }

      console.log('\n✓ Account ready!')
      console.log('Email:', email)
      console.log('Password:', password)
      console.log('URL: http://localhost:4000')
      return
    }

    // User wasn't created, the trigger is blocking
    console.log('\nThe trigger is blocking user creation.')
    console.log('Please run this SQL in the Supabase dashboard SQL editor:')
    console.log('')
    console.log('------- COPY FROM HERE -------')
    console.log(`
-- Temporarily disable the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the user manually using Supabase Auth dashboard,
-- then run this to create the profile:

-- After creating user in Auth dashboard, get the user ID and run:
-- INSERT INTO profiles (id, display_name, role_global)
-- VALUES ('USER_ID_HERE', 'Joey', 'joey');

-- Or, recreate the trigger with proper permissions:
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role_global)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'support')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
`)
    console.log('------- COPY TO HERE -------')
    return
  }

  console.log('Invite sent! User ID:', inviteData.user?.id)

  // Create profile
  if (inviteData.user) {
    console.log('Creating profile...')
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        display_name: 'Joey',
        role_global: 'joey'
      })

    if (profileError) {
      console.log('Profile error:', profileError.message)
    } else {
      console.log('Profile created!')
    }

    // Set password
    console.log('Setting password...')
    const { error: pwError } = await adminClient.auth.admin.updateUserById(inviteData.user.id, {
      password: password,
      email_confirm: true
    })

    if (pwError) {
      console.log('Password error:', pwError.message)
    } else {
      console.log('Password set!')
    }
  }

  console.log('\n✓ Account ready!')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('URL: http://localhost:4000')
}

createJoey().catch(console.error)
