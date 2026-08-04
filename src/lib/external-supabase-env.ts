// Points all server-side Supabase clients at the external Supabase project.
// The generated clients read env.SUPABASE_*, so we override those with
// the EXTERNAL_SUPABASE_* secrets before any client is constructed.
const env = typeof process !== "undefined" && process.env ? process.env : ({} as Record<string, string | undefined>);

const url = env.EXTERNAL_SUPABASE_URL;
const publishable = env.EXTERNAL_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;

if (url) env.SUPABASE_URL = url;
if (publishable) {
  env.SUPABASE_PUBLISHABLE_KEY = publishable;
  env.SUPABASE_ANON_KEY = publishable;
}
if (serviceRole) env.SUPABASE_SERVICE_ROLE_KEY = serviceRole;

export {};
