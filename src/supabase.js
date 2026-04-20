import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xamqyiokzpibzuvhalzc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbXF5aW9renBpYnp1dmhhbHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODg3OTgsImV4cCI6MjA5MjI2NDc5OH0.-n9N76n2COJz0rmtGlZ1dfplGccC2O6_KCKJJCdSmgc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
