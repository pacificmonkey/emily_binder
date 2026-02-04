import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

console.log('[Supabase] Initializing with URL:', supabaseUrl ? 'configured' : 'missing')

// Create untyped client - we cast results in services for type safety
// For full type safety, generate types with: supabase gen types typescript
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'placeholder-key'
)

// Debug function to test database connection
export async function testDatabaseConnection() {
  console.log('[Supabase] Testing database connection...')

  // Test 1: Check if profiles table exists
  const { error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (profileError) {
    console.error('[Supabase] profiles table error:', profileError.message, profileError.code)
  } else {
    console.log('[Supabase] profiles table OK')
  }

  // Test 2: Check if events table exists
  const { error: eventsError } = await supabase
    .from('events')
    .select('id')
    .limit(1)

  if (eventsError) {
    console.error('[Supabase] events table error:', eventsError.message, eventsError.code)
  } else {
    console.log('[Supabase] events table OK')
  }

  // Test 3: Check if health_medications table exists
  const { error: medsError } = await supabase
    .from('health_medications')
    .select('id')
    .limit(1)

  if (medsError) {
    console.error('[Supabase] health_medications table error:', medsError.message, medsError.code)
  } else {
    console.log('[Supabase] health_medications table OK')
  }

  // Test 4: Check admin tables
  const adminTables = ['categories', 'sticker_catalog', 'economy_config', 'goals', 'mission_proposals', 'joey_todos']
  const adminResults: Record<string, boolean> = {}

  for (const table of adminTables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error) {
      console.error(`[Supabase] ${table} table error:`, error.message, error.code)
      adminResults[table] = false
    } else {
      console.log(`[Supabase] ${table} table OK`)
      adminResults[table] = true
    }
  }

  return {
    profiles: !profileError,
    events: !eventsError,
    medications: !medsError,
    ...adminResults,
  }
}

// Run test on load in development
if (import.meta.env.DEV) {
  testDatabaseConnection()
}
