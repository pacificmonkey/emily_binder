/**
 * Check database structure
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxlbnfarkaaqxpsgwuwk.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGJuZmFya2FhcXhwc2d3dXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc0MjI1OSwiZXhwIjoyMDg1MzE4MjU5fQ.XFr3osbROpQWcKLG6ssH77E4xOrklwsjLCdPHsePV5I'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkDatabase() {
  console.log('Checking database structure...\n')

  // Check profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5)

  console.log('Profiles table:')
  if (profilesError) {
    console.log('  Error:', profilesError.message)
  } else {
    console.log('  Exists: Yes')
    console.log('  Rows:', profiles?.length ?? 0)
    if (profiles && profiles.length > 0) {
      console.log('  Sample:', JSON.stringify(profiles[0], null, 2))
    }
  }

  // Check auth users
  console.log('\nAuth users:')
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.log('  Error:', usersError.message)
  } else {
    console.log('  Count:', users?.users?.length ?? 0)
    users?.users?.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`)
    })
  }

  // Check categories table
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .limit(3)

  console.log('\nCategories table:')
  if (catError) {
    console.log('  Error:', catError.message)
  } else {
    console.log('  Exists: Yes')
    console.log('  Rows:', categories?.length ?? 0)
  }

  // Check economy_state table
  const { data: economy, error: econError } = await supabase
    .from('economy_state')
    .select('*')
    .limit(1)

  console.log('\nEconomy state table:')
  if (econError) {
    console.log('  Error:', econError.message)
  } else {
    console.log('  Exists: Yes')
    console.log('  Rows:', economy?.length ?? 0)
  }
}

checkDatabase().catch(console.error)
