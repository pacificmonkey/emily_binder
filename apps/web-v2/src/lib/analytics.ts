import { supabase } from '@/lib/supabase'

export function trackEvent(name: string, properties?: Record<string, string>) {
  supabase.from('usage_event').insert({
    event_name: name,
    event_properties: { ...properties },
  }).then()
}
