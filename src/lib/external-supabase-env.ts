// Points all server-side Supabase clients at the external Supabase project.
// The generated clients read process.env.SUPABASE_*, so we override those with
// the EXTERNAL_SUPABASE_* secrets before any client is constructed.
const url = process.env.EXTERNAL_SUPABASE_URL;
const publishable = process.env.EXTERNAL_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;

if (url) process.env.SUPABASE_URL = url;
if (publishable) {
  process.env.SUPABASE_PUBLISHABLE_KEY = publishable;
  process.env.SUPABASE_ANON_KEY = publishable;
}
if (serviceRole) process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole;

export {};
