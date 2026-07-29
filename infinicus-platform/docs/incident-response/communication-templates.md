# Communication Templates

These are templates for `platform.incident_updates` entries with `isCustomerFacing: true` — the subset of the timeline suitable for a public status page or direct customer notification. Internal (`isCustomerFacing: false`) updates have no template requirement — write whatever is operationally useful for the response team.

## Initial notification (posted at `investigating`)

> **[{severity display name}] {short title}**
> We are investigating reports of {plain-language description of the symptom, not the cause — do not speculate on root cause in the first update}. {Affected capability/tenants, as specifically as known.} We will post an update within {target cadence per severity-model.md}.

## Root cause identified (posted at `identified`)

> **Update — {short title}**
> We have identified the cause of this issue and are working on a fix. {One sentence on the fix approach, in plain language — "we are rolling back a recent change" / "we are restoring from backup" / "we are working with our infrastructure provider," not internal jargon or exact commands.} Next update by {time}.

## Fix deployed, monitoring (posted at `monitoring`)

> **Update — {short title}**
> A fix has been deployed and we are monitoring to confirm full resolution. {If there was any data impact, state it plainly here — do not bury a data-loss disclosure in a later update.}

## Resolved (posted at `resolved`)

> **Resolved — {short title}**
> This issue has been resolved as of {time}. {One sentence on what happened, at a level appropriate for a customer, e.g. "A deployment introduced a defect that was rolled back" rather than exact technical detail.} {If applicable: "A full post-incident review will be published at {postmortemUrl}."}

## Security incident (posted at any status, only once legal/communications has approved — see security-incident.md)

> **Security notice — {short title}**
> {Only after containment is confirmed and communications approval obtained.} We identified {plain description of what happened} on {date}. {What data, if any, was affected — be specific and accurate, not minimizing.} {What we have done in response.} {What affected users/tenants should do, if anything.}

## Provider outage

> **[{severity display name}] {short title}**
> We are experiencing degraded service due to an issue with {provider name, only if the provider has themselves acknowledged the issue publicly — otherwise say "one of our infrastructure providers" to avoid contradicting or preempting their own communications}. This is outside our direct control; we are monitoring closely and will update as we learn more.

## General principles

- **Plain language, no internal jargon or exact commands/table names** — a customer-facing update should never read like an internal runbook step.
- **State known facts, not speculation** — "we are investigating" is honest at `investigating`; do not guess at a root cause before it's confirmed.
- **Never bury bad news** — a data-loss or security-impact disclosure belongs in the update where it's first known, not deferred to the final resolution notice.
- **Match cadence to severity-model.md** — silence during an active Sev1 erodes trust faster than an update saying "still investigating, no new information."
