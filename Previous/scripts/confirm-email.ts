/**
 * Confirm email for Joey account
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxlbnfarkaaqxpsgwuwk.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGJuZmFya2FhcXhwc2d3dXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc0MjI1OSwiZXhwIjoyMDg1MzE4MjU5fQ.XFr3osbROpQWcKLG6ssH77E4xOrklwsjLCdPHsePV5I'

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function confirmEmail() {
  const userId = 'f8a2a314-1260-47eb-8abb-d6b530ee58f1'

  console.log('Confirming email for user...')

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    email_confirm: true
  })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('Email confirmed!')
  console.log('')
  console.log('You can now log in at: http://localhost:4000')
  console.log('Email: pacific.joseph@gmail.com')
  console.log('Password: 123456temporarytesting')
}

confirmEmail().catch(console.error)
