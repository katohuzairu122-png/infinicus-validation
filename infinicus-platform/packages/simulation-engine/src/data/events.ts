import { rndi } from '../random.js';
import type { SimEvent } from '../types.js';

/** Ported verbatim from index.html (25-entry event pool). */
export const EVT_POOL: Array<Omit<SimEvent, 'day'>> = [
  { type: 'econ', msg: 'Raw material prices rose 7% due to supply chain disruption.',         impact: -.07 },
  { type: 'econ', msg: 'Favourable exchange rate dropped import costs by 5%.',                impact: .05 },
  { type: 'econ', msg: 'Government tax filing deadline reduced local discretionary spend.',   impact: -.04 },
  { type: 'econ', msg: 'Utility costs spiked 15% due to seasonal demand.',                    impact: -.06 },
  { type: 'econ', msg: 'New government grant for small businesses reduced operating costs.',  impact: .08 },
  { type: 'econ', msg: 'Inflation hit 6% — customers tightened discretionary spending.',      impact: -.05 },
  { type: 'cust', msg: 'Repeat customer posted a glowing review — organic reach spiked.',      impact: .10 },
  { type: 'cust', msg: 'Batch of customers requested refunds after a quality complaint.',      impact: -.09 },
  { type: 'cust', msg: 'Local influencer shared your product unprompted.',                     impact: .14 },
  { type: 'cust', msg: 'Word-of-mouth referral wave doubled new sign-ups this week.',          impact: .16 },
  { type: 'cust', msg: 'A key customer segment churned after competitor launched free tier.',  impact: -.12 },
  { type: 'comp', msg: 'A direct competitor launched a 20% discount campaign.',                impact: -.11 },
  { type: 'comp', msg: 'Main competitor went offline for 3 days — customers migrated.',        impact: .12 },
  { type: 'comp', msg: 'Industry leader announced market exit — captured displaced customers.',impact: .15 },
  { type: 'comp', msg: 'Three new local competitors entered your niche this week.',            impact: -.08 },
  { type: 'ops',  msg: 'Key team member was sick for two days — operations slowed.',           impact: -.08 },
  { type: 'ops',  msg: 'Automation upgrade cut processing time by 30%.',                       impact: .06 },
  { type: 'ops',  msg: 'Equipment failure caused a 6-hour service outage.',                    impact: -.13 },
  { type: 'ops',  msg: 'Supply chain disruption delayed inventory by 5 days.',                 impact: -.09 },
  { type: 'ops',  msg: 'Partnership with logistics provider cut delivery costs 20%.',          impact: .07 },
  { type: 'mkt',  msg: 'Ad creative outperformed baseline 2×; CPC dropped 40%.',                impact: .12 },
  { type: 'mkt',  msg: 'Ad account flagged and paused for 48 hours.',                          impact: -.10 },
  { type: 'mkt',  msg: 'Email campaign achieved a 38% open rate — best this month.',            impact: .07 },
  { type: 'mkt',  msg: 'Viral social media post earned 50K organic impressions.',              impact: .18 },
  { type: 'mkt',  msg: 'Key marketing channel policy change reduced ad reach 30%.',             impact: -.11 },
];

/** Ported verbatim from index.html. */
export function pickEvents(): SimEvent[] {
  const usedDays = new Set<number>();
  const count = rndi(4, 8);
  const shuffled = [...EVT_POOL].sort(() => Math.random() - .5);
  return shuffled.slice(0, count).map((e) => {
    let day: number;
    do { day = rndi(2, 59); } while (usedDays.has(day));
    usedDays.add(day);
    return { ...e, day };
  }).sort((a, b) => a.day - b.day);
}
