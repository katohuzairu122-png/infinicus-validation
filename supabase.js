/**
 * INFINICUS ENGINE — Supabase Backend Integration
 *
 * Status: STUB — drop in real values when ready to go live.
 *
 * To activate:
 *  1. Create a Supabase project at https://supabase.com
 *  2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
 *  3. Run the SQL in /supabase-schema.sql to create tables
 *  4. Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *     to index.html before this file
 *  5. Set INFINICUS_BACKEND = true in index.html
 */

const SUPABASE_URL      = 'https://your-project.supabase.co';   // replace
const SUPABASE_ANON_KEY = 'your-anon-key-here';                  // replace

// --- Client initialisation (tree-shaken when INFINICUS_BACKEND is false) ---
let _sb = null;
function getClient() {
  if (!_sb && typeof supabase !== 'undefined') {
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _sb;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * Sign up a new user with email + password.
 * On success Supabase sends a confirmation email.
 * Returns { user, error }.
 */
async function sbSignUp(email, password, name) {
  const sb = getClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  return { user: data?.user, error };
}

/**
 * Sign in an existing user.
 * Returns { session, error }.
 */
async function sbSignIn(email, password) {
  const sb = getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { session: data?.session, error };
}

/**
 * Sign out the current user.
 */
async function sbSignOut() {
  await getClient()?.auth.signOut();
}

/**
 * Returns the current session or null.
 */
async function sbGetSession() {
  const { data } = await getClient()?.auth.getSession() ?? {};
  return data?.session ?? null;
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

/**
 * Upsert the user's profile row in the `profiles` table.
 * Called after sign-up and after plan upgrade.
 */
async function sbSaveProfile(userId, { name, email, plan, simCount }) {
  const { error } = await getClient()
    .from('profiles')
    .upsert({ id: userId, name, email, plan, sim_count: simCount, updated_at: new Date().toISOString() });
  return error;
}

/**
 * Fetch the user's profile — used to hydrate U on app load.
 */
async function sbGetProfile(userId) {
  const { data, error } = await getClient()
    .from('profiles')
    .select('name, email, plan, sim_count')
    .eq('id', userId)
    .single();
  if (error) return null;
  return { name: data.name, email: data.email, plan: data.plan, simCount: data.sim_count };
}

// ─── SIMULATIONS ──────────────────────────────────────────────────────────────

/**
 * Save a completed simulation to the `simulations` table.
 * `params` is S.params, `summary` is a lightweight snapshot (no raw day array).
 */
async function sbSaveSimulation(userId, params, summary) {
  const { data, error } = await getClient()
    .from('simulations')
    .insert({
      user_id:   userId,
      params:    params,
      summary:   summary,
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();
  return { id: data?.id, error };
}

/**
 * Fetch the user's last N simulations for the history panel (future feature).
 */
async function sbGetSimulations(userId, limit = 10) {
  const { data, error } = await getClient()
    .from('simulations')
    .select('id, params, summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { simulations: data ?? [], error };
}

// ─── STRIPE WEBHOOK HANDLER (server-side, Node/Deno) ─────────────────────────
//
// Deploy this as a Supabase Edge Function: supabase/functions/stripe-webhook/index.ts
//
// import Stripe from 'https://esm.sh/stripe@14';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
// const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
//
// Deno.serve(async (req) => {
//   const sig  = req.headers.get('stripe-signature');
//   const body = await req.text();
//   const event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
//
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;
//     const userId  = session.metadata.supabase_user_id;
//     const plan    = session.metadata.plan; // 'starter' | 'growth' | 'professional'
//     await sb.from('profiles').update({ plan }).eq('id', userId);
//   }
//
//   if (event.type === 'customer.subscription.deleted') {
//     const sub    = event.data.object;
//     const userId = sub.metadata.supabase_user_id;
//     await sb.from('profiles').update({ plan: 'free' }).eq('id', userId);
//   }
//
//   return new Response('ok');
// });

// ─── SQL SCHEMA (run in Supabase SQL Editor) ──────────────────────────────────
//
// -- Enable RLS
// alter table auth.users enable row level security;
//
// create table public.profiles (
//   id          uuid references auth.users on delete cascade primary key,
//   name        text,
//   email       text unique,
//   plan        text default 'free' check (plan in ('free','starter','growth','professional')),
//   sim_count   int  default 0,
//   stripe_customer_id text,
//   updated_at  timestamptz default now()
// );
// alter table public.profiles enable row level security;
// create policy "Users manage own profile"
//   on public.profiles for all using (auth.uid() = id);
//
// create table public.simulations (
//   id          uuid primary key default gen_random_uuid(),
//   user_id     uuid references public.profiles(id) on delete cascade,
//   params      jsonb not null,
//   summary     jsonb,
//   created_at  timestamptz default now()
// );
// alter table public.simulations enable row level security;
// create policy "Users see own sims"
//   on public.simulations for all using (auth.uid() = user_id);
//
// -- Trigger: auto-create profile row on sign-up
// create or replace function public.handle_new_user()
// returns trigger language plpgsql security definer as $$
// begin
//   insert into public.profiles (id, email)
//   values (new.id, new.email);
//   return new;
// end;
// $$;
// create trigger on_auth_user_created
//   after insert on auth.users
//   for each row execute procedure public.handle_new_user();
