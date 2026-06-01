import { supabase } from './supabase'

// Fire-and-forget call to the `run-checks` Edge Function to check a single monitor
// on demand (the "Check now" button). Best-effort; never blocks the UI.
export async function checkNow(monitorId) {
  try {
    const { data, error } = await supabase.functions.invoke('run-checks', {
      body: { monitor_id: monitorId },
    })
    if (error) throw error
    return data
  } catch {
    return null
  }
}
