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

async function sbSignUp(email, password, name) {
  const sb = getClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  return { user: data?.user, error };
}

async function sbSignIn(email, password) {
  const sb = getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { session: data?.session, error };
}

async function sbSignOut() {
  await getClient()?.auth.signOut();
}

async function sbGetSession() {
  const { data } = await getClient()?.auth.getSession() ?? {};
  return data?.session ?? null;
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

async function sbSaveProfile(userId, { name, email, plan, simCount }) {
  const { error } = await getClient()
    .from('profiles')
    .upsert({ id: userId, name, email, plan, sim_count: simCount, updated_at: new Date().toISOString() });
  return error;
}

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

async function sbGetSimulations(userId, limit = 10) {
  const { data, error } = await getClient()
    .from('simulations')
    .select('id, params, summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { simulations: data ?? [], error };
}

// ─── STRIPE WEBHOOK — deploy as Supabase Edge Function ───────────────────────
// supabase/functions/stripe-webhook/index.ts
//
// import Stripe from 'https://esm.sh/stripe@14';
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
// const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
// Deno.serve(async (req) => {
//   const sig  = req.headers.get('stripe-signature');
//   const body = await req.text();
//   const event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;
//     await sb.from('profiles').update({ plan: session.metadata.plan }).eq('id', session.metadata.supabase_user_id);
//   }
//   if (event.type === 'customer.subscription.deleted') {
//     await sb.from('profiles').update({ plan: 'free' }).eq('id', event.data.object.metadata.supabase_user_id);
//   }
//   return new Response('ok');
// });

// ─── SQL SCHEMA (run in Supabase SQL Editor) ──────────────────────────────────
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
// create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id);
//
// create table public.simulations (
//   id          uuid primary key default gen_random_uuid(),
//   user_id     uuid references public.profiles(id) on delete cascade,
//   params      jsonb not null,
//   summary     jsonb,
//   created_at  timestamptz default now()
// );
// alter table public.simulations enable row level security;
// create policy "Users see own sims" on public.simulations for all using (auth.uid() = user_id);
//
// create or replace function public.handle_new_user()
// returns trigger language plpgsql security definer as $$
// begin
//   insert into public.profiles (id, email) values (new.id, new.email);
//   return new;
// end; $$;
// create trigger on_auth_user_created after insert on auth.users
//   for each row execute procedure public.handle_new_user();
