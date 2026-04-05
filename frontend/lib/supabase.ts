import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = "https://lhwvcwakbcegwknvezpe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ML8GDmkJyOWww8obM_v9Og_Q8Q5Hnsm";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return browserClient;
}
