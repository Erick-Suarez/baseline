import { createClient } from "@supabase/supabase-js";

// This client has service_role privileges
// Only import this on the server side
export const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    db: { schema: "main" },
  }
);
