// functions/api/auth/request.js — DEPRECATED
// Magic-link auth was replaced by password-based auth (login.js / register.js).
// This endpoint is no longer active.
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: false, error: 'This auth method is no longer supported. Please use the sign-in form.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
