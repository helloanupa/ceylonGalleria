import { createClient } from '@supabase/supabase-js';

// Replace with your own Supabase URL & anon key (found in Supabase dashboard → Settings → API)
const SUPABASE_URL = 'https://usqyksnfpxftkpqkkguo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcXlrc25mcHhmdGtwcWtrZ3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTkwNTgsImV4cCI6MjA3NTkzNTA1OH0.q5VI7dITm8wyVkYj0dw-kvoc48cVWkbHKk-isSmlZuc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);