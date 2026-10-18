import { createClient } from '@supabase/supabase-js';

// Base URL clean-up: Supabase JS client requires https://<project>.supabase.co
const rawUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://vljasrjfsqrjybzccpba.supabase.co';
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsamFzcmpmc3FyanliemNjcGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODAzOTcsImV4cCI6MjEwNzg1NjM5N30.6cqvnqJ77nFCYX3ACKAOcKvxdu95XgWDERhS-M5RYDk';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
