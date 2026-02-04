/**
 * Script to create Joey admin account
 * Run with: npx tsx scripts/create-joey-account.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxlbnfarkaaqxpsgwuwk.supabase.co'
const anonKey = 'sb_secret_KSbZsU1LdHxrx_8RwqMCFQ_gXSSDJHN'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGJuZmFya2FhcXhwc2d3dXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc0MjI1OSwiZXhwIjoyMDg1MzE4MjU5fQ.XFr3osbROpQWcKLG6ssH77E4xOrklwsjLCdPHsePV5I'

// Create admin client with service role key
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create regular client for signup
const supabase = createClient(supabaseUrl, anonKey)

async function createJoeyAccount() {
  const email = 'pacific.joseph@gmail.com'
  const password = '123456temporarytesting'

  console.log('Creating Joey account...')

  // First, check if profiles table exists
  const { data: tableCheck, error: tableError } = await adminClient
    .from('profiles')
    .select('id')
    .limit(1)

  if (tableError) {
    console.log('Profiles table may not exist yet. Error:', tableError.message)
    console.log('')
    console.log('The migrations may not be applied to Supabase yet.')
    console.log('Please run the migrations first, or I can create the account')
    console.log('using an alternative method.')
    console.log('')

    // Try signing up anyway - the trigger might create the profile
    console.log('Attempting to create user via standard signup...')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: 'Joey',
          role: 'joey'
        }
      }
    })

    if (signUpError) {
      console.error('Signup error:', signUpError.message)

      // Try to sign in instead
      console.log('Trying to sign in (user may already exist)...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        console.error('Sign in error:', signInError.message)
        return
      }

      console.log('User exists and can sign in!')
      console.log('User ID:', signInData.user?.id)

      // Update to joey role using admin
      if (signInData.user) {
        const { error: updateError } = await adminClient
          .from('profiles')
          .upsert({
            id: signInData.user.id,
            display_name: 'Joey',
            role_global: 'joey'
          })

        if (updateError) {
          console.log('Could not update profile (table may not exist):', updateError.message)
        } else {
          console.log('Profile updated to joey role!')
        }
      }
      return
    }

    console.log('User created via signup!')
    console.log('User ID:', signUpData.user?.id)
    console.log('')
    console.log('Note: You may need to confirm the email or the profile trigger')
    console.log('may need migrations to be applied.')
    return
  }

  // Profiles table exists - first check if user already exists
  console.log('Profiles table found. Checking if user exists...')

  const { data: users } = await adminClient.auth.admin.listUsers()
  const existingUser = users?.users?.find(u => u.email === email)

  if (existingUser) {
    console.log('User already exists!')
    console.log('User ID:', existingUser.id)

    // Update/create profile with joey role
    const { error: updateError } = await adminClient
      .from('profiles')
      .upsert({
        id: existingUser.id,
        display_name: 'Joey',
        role_global: 'joey'
      })

    if (updateError) {
      console.error('Error updating profile:', updateError)
    } else {
      console.log('Profile set to joey role!')
    }

    console.log('')
    console.log('You can log in at http://localhost:4000')
    console.log('Email:', email)
    console.log('Password: 123456temporarytesting')
    return
  }

  // User doesn't exist, try to create via signup first (to avoid trigger issues)
  console.log('User does not exist. Creating via signup...')

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: 'Joey',
        role: 'joey'
      }
    }
  })

  if (signUpError) {
    console.error('Signup error:', signUpError.message)

    // Try admin create as fallback
    console.log('Trying admin create...')
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: 'Joey',
        role: 'joey'
      }
    })

    if (authError) {
      console.error('Admin create error:', authError)
      return
    }

    console.log('Created via admin API!')
    console.log('User ID:', authData.user?.id)
  } else {
    console.log('Signup successful!')
    console.log('User ID:', signUpData.user?.id)

    // Ensure profile has joey role
    if (signUpData.user) {
      const { error: updateError } = await adminClient
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
          display_name: 'Joey',
          role_global: 'joey'
        })

      if (updateError) {
        console.log('Note: Could not set profile role:', updateError.message)
      } else {
        console.log('Profile set to joey role!')
      }
    }
  }

  console.log('')
  console.log('Account created! You can now log in at http://localhost:4000')
  console.log('Email:', email)
  console.log('Password: 123456temporarytesting')
  console.log('')
  console.log('Note: You may need to confirm the email if email confirmation is enabled.')
}

createJoeyAccount().catch(console.error)
