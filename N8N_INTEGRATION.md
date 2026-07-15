# INFINICUS ↔ n8n Automation

How the live site at **infini-cus.com** (Cloudflare Pages) connects to n8n
(`infinicusv3.app.n8n.cloud`) for automation.

The site and n8n talk over plain **HTTP** — no special integration, no MCP required
at runtime. Two directions:

- **Site → n8n** (outbound webhooks): the site POSTs events to an n8n *Webhook
  Trigger* when something happens (waitlist signup, feedback).
- **n8n → Site** (scheduled calls): an n8n *Schedule Trigger* calls an existing site
  endpoint on a timer (nurture emails).

All three are **opt-in and safe**: the outbound webhooks are inert until you set their
env vars, and the scheduled call uses the Bearer-token-protected endpoint that already
exists.

---

## 1. Waitlist signups → n8n  (Site → n8n)

**Endpoint:** `POST /api/waitlist`
**Env var:** `N8N_WAITLIST_WEBHOOK_URL`

When set, every signup is POSTed to n8n (fire-and-forget via `waitUntil`, so it never
delays or breaks the form). Payload:

```json
{
  "event": "waitlist.signup",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "tier": "pro",
  "signedUpAt": "2026-07-15T10:00:00.000Z",
  "source": "infini-cus.com"
}
```

**Build it in n8n:**
1. New workflow → add a **Webhook** node (Trigger). Method `POST`.
2. Copy its **Production URL**.
3. Add downstream nodes: Google Sheets / Airtable append, Slack/Discord message,
   HubSpot/CRM contact, mailing-list tag — whatever you want.
4. **Activate** the workflow (webhooks only fire the Production URL when active).
5. In Cloudflare → Pages project → Settings → Environment Variables, set
   `N8N_WAITLIST_WEBHOOK_URL` = that Production URL. Redeploy.

---

## 2. Feedback submissions → n8n  (Site → n8n)

**Endpoint:** `POST /api/feedback`
**Env var:** `N8N_FEEDBACK_WEBHOOK_URL`

Payload:

```json
{
  "event": "feedback.submitted",
  "rating": 4,
  "recommend": true,
  "comment": "Loved the Monte Carlo report",
  "verdict": "go",
  "submittedAt": "2026-07-15T10:00:00.000Z",
  "source": "infini-cus.com"
}
```

**Build it in n8n:** same as above (Webhook Trigger → your nodes). A common pattern:
an **IF** node routing `rating <= 2` to an urgent Slack alert, everything else to a
log sheet. Then set `N8N_FEEDBACK_WEBHOOK_URL` in Cloudflare and redeploy.

---

## 3. Daily nurture emails via n8n  (n8n → Site)  — no code change

**Endpoint:** `POST /api/nurture-batch` (already built, Bearer-token protected)

Replaces cron-job.org with n8n as your scheduler.

**Build it in n8n:**
1. New workflow → **Schedule Trigger** node → once per day (e.g. 08:00 UTC).
2. Add an **HTTP Request** node:
   - Method: `POST`
   - URL: `https://infini-cus.com/api/nurture-batch`
   - Header: `Authorization: Bearer <your NURTURE_BATCH_SECRET>`
     (store the secret as an n8n credential/variable, not inline).
3. Activate the workflow.

No env var needed on the Cloudflare side for this one — `NURTURE_BATCH_SECRET` is
already configured there for the endpoint's auth gate.

---

## Security notes

- Treat the n8n Webhook Production URLs as secrets — anyone with the URL can post to
  your workflow. Consider adding a shared-secret header check in the n8n workflow if
  you want to harden it.
- The outbound payloads contain user email addresses. Make sure the downstream n8n
  destinations (sheets, CRMs) are ones you control.
- Nothing in this integration commits secrets to the repo — all tokens/URLs live in
  Cloudflare env vars and n8n credentials.
