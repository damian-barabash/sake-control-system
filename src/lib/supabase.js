import { createClient } from '@supabase/supabase-js'

// Anon key is public by design — access is gated by Row Level Security.
const SUPABASE_URL = 'https://qnznezdhgfoxfkktzznw.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuem5lemRoZ2ZveGZra3R6em53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDcyODcsImV4cCI6MjA5NTg4MzI4N30._tb1bZ7ezl7dMu0Ihqpnd7OkBuKmLAZrz6jndfgynPs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
