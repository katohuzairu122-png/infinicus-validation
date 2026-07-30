import type { IndustryCode, IndustryProfile } from '../types.js';

/** Ported verbatim from index.html. 90-day simulation horizon. */
export const SIM_DAYS = 90;

const _flat: number[] = Array(SIM_DAYS).fill(1);
const _wknd = (d: number): number => (d % 7 === 0 || d % 7 === 6) ? 1.35 : 0.92;
const _ramp = (d: number): number => 0.6 + (d - 1) / (SIM_DAYS - 1) * 0.8;

export const PROFILES: Record<IndustryCode, IndustryProfile> = {
  food:        { fixR: .32, varR: .42, acqCost: 8,  churn: .18, mktMult: 1.2, visitsPerMonth: 14,  fixBase: 8,  organicMult: 5.0, name: 'Food & Beverage',        priceLabel: 'Price Per Sale',           season: Array.from({ length: SIM_DAYS }, (_, i) => _wknd(i + 1)) },
  retail:      { fixR: .22, varR: .52, acqCost: 12, churn: .22, mktMult: 1.5, visitsPerMonth: 2.5, fixBase: 7,  organicMult: 4.0, name: 'Retail / E-commerce',    priceLabel: 'Price Per Order',           season: Array.from({ length: SIM_DAYS }, (_, i) => 0.7 + i / (SIM_DAYS - 1) * .7) },
  saas:        { fixR: .38, varR: .08, acqCost: 40, churn: .07, mktMult: 2.0, visitsPerMonth: 1,   fixBase: 28, organicMult: 0.3, name: 'SaaS / Software',        priceLabel: 'Monthly Subscription',      season: _flat },
  service:     { fixR: .28, varR: .28, acqCost: 25, churn: .09, mktMult: 1.3, visitsPerMonth: 3,   fixBase: 18, organicMult: 2.0, name: 'Service Business',       priceLabel: 'Price Per Session',         season: _flat },
  fitness:     { fixR: .42, varR: .18, acqCost: 20, churn: .11, mktMult: 1.1, visitsPerMonth: 1,   fixBase: 22, organicMult: 3.5, name: 'Fitness & Wellness',     priceLabel: 'Monthly Membership',        season: _flat },
  agency:      { fixR: .32, varR: .18, acqCost: 80, churn: .05, mktMult: 1.6, visitsPerMonth: 1,   fixBase: 22, organicMult: 0.8, name: 'Agency / Consulting',    priceLabel: 'Monthly Retainer',          season: _flat },
  health:      { fixR: .40, varR: .22, acqCost: 55, churn: .06, mktMult: 1.1, visitsPerMonth: 2,   fixBase: 18, organicMult: 2.5, name: 'Healthcare & MedTech',   priceLabel: 'Price Per Appointment',     season: _flat },
  edtech:      { fixR: .34, varR: .14, acqCost: 30, churn: .12, mktMult: 1.8, visitsPerMonth: 1,   fixBase: 20, organicMult: 0.4, name: 'EdTech & Training',      priceLabel: 'Course / Subscription',     season: Array.from({ length: SIM_DAYS }, (_, i) => _ramp(i + 1)) },
  marketplace: { fixR: .18, varR: .28, acqCost: 18, churn: .15, mktMult: 2.2, visitsPerMonth: 4,   fixBase: 20, organicMult: 0.5, name: 'Marketplace / Platform', priceLabel: 'GMV Take Rate (price=avg)', season: Array.from({ length: SIM_DAYS }, (_, i) => 0.5 + i / (SIM_DAYS - 1) * 1.2) },
  events:      { fixR: .45, varR: .35, acqCost: 22, churn: .30, mktMult: 1.4, visitsPerMonth: 1.5, fixBase: 18, organicMult: 5.0, name: 'Events & Hospitality',   priceLabel: 'Ticket / Cover Price',      season: Array.from({ length: SIM_DAYS }, (_, i) => _wknd(i + 1) * 1.1) },
  fintech:     { fixR: .36, varR: .12, acqCost: 45, churn: .08, mktMult: 1.9, visitsPerMonth: 8,   fixBase: 28, organicMult: 0.2, name: 'FinTech',                priceLabel: 'Fee Per Transaction',       season: _flat },
  realestate:  { fixR: .35, varR: .15, acqCost: 90, churn: .04, mktMult: 1.3, visitsPerMonth: 1,   fixBase: 18, organicMult: 1.2, name: 'Real Estate / PropTech', priceLabel: 'Commission / Platform Fee', season: _flat },
  logistics:   { fixR: .30, varR: .45, acqCost: 15, churn: .20, mktMult: 1.4, visitsPerMonth: 8,   fixBase: 14, organicMult: 3.5, name: 'Logistics & Delivery',   priceLabel: 'Price Per Delivery',        season: Array.from({ length: SIM_DAYS }, (_, i) => _wknd(i + 1)) },
};
