// This forces the Lovable app to use your own Supabase project directly.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// 🔗 Your actual Supabase credentials
const SUPABASE_URL = "https://tmosgwosbqltqlrwtuph.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nXZO0R9vwso0dFmCK-HrGw_eHdOgqh5";
("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtb3Nnd29zYnFsdHFscnd0dXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MjcxMzgsImV4cCI6MjA3NTMwMzEzOH0.yZ0Zkg82ddTyhRlibmTm1el7EzWNEyNuwwpvKoMJjz");

// ⚙ Create and export the client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
