interface LocationCostEntry {
  keys: string[];
  costMult: number;
  cacMult: number;
  label: string;
}

/** Ported verbatim from index.html. */
export const LOCATION_COSTS: LocationCostEntry[] = [
  // Ultra high cost cities
  { keys: ['new york', 'nyc', 'manhattan', 'brooklyn'],                        costMult: 1.85, cacMult: 1.60, label: 'New York' },
  { keys: ['san francisco', 'sf', 'bay area', 'silicon valley', 'palo alto'],  costMult: 1.95, cacMult: 1.65, label: 'San Francisco' },
  { keys: ['zurich', 'geneva', 'switzerland'],                                costMult: 2.00, cacMult: 1.70, label: 'Switzerland' },
  { keys: ['hong kong'],                                                      costMult: 1.80, cacMult: 1.55, label: 'Hong Kong' },
  { keys: ['oslo', 'norway'],                                                 costMult: 1.90, cacMult: 1.60, label: 'Norway' },
  { keys: ['singapore'],                                                      costMult: 1.75, cacMult: 1.50, label: 'Singapore' },
  { keys: ['tokyo', 'japan'],                                                 costMult: 1.65, cacMult: 1.45, label: 'Japan' },
  { keys: ['sydney', 'melbourne', 'brisbane', 'australia'],                   costMult: 1.60, cacMult: 1.40, label: 'Australia' },
  { keys: ['dubai', 'uae', 'abu dhabi'],                                      costMult: 1.60, cacMult: 1.40, label: 'UAE' },
  { keys: ['london', 'uk', 'england', 'scotland', 'wales'],                   costMult: 1.70, cacMult: 1.45, label: 'UK' },
  // High cost
  { keys: ['los angeles', 'la', 'chicago', 'boston', 'seattle', 'miami', 'houston', 'dallas', 'atlanta', 'usa', 'united states'], costMult: 1.55, cacMult: 1.35, label: 'USA' },
  { keys: ['stockholm', 'sweden'],                                            costMult: 1.50, cacMult: 1.30, label: 'Sweden' },
  { keys: ['paris', 'france'],                                                costMult: 1.45, cacMult: 1.30, label: 'France' },
  { keys: ['toronto', 'vancouver', 'calgary', 'canada'],                      costMult: 1.40, cacMult: 1.25, label: 'Canada' },
  { keys: ['amsterdam', 'netherlands', 'holland'],                            costMult: 1.40, cacMult: 1.25, label: 'Netherlands' },
  { keys: ['berlin', 'munich', 'frankfurt', 'hamburg', 'germany'],            costMult: 1.30, cacMult: 1.20, label: 'Germany' },
  { keys: ['dublin', 'ireland'],                                              costMult: 1.35, cacMult: 1.22, label: 'Ireland' },
  { keys: ['new zealand', 'auckland', 'wellington'],                          costMult: 1.45, cacMult: 1.28, label: 'New Zealand' },
  // Mid cost
  { keys: ['johannesburg', 'cape town', 'pretoria', 'south africa'],          costMult: 0.90, cacMult: 0.95, label: 'South Africa' },
  { keys: ['istanbul', 'ankara', 'turkey'],                                   costMult: 0.65, cacMult: 0.70, label: 'Turkey' },
  { keys: ['kuala lumpur', 'kl', 'malaysia'],                                 costMult: 0.65, cacMult: 0.70, label: 'Malaysia' },
  { keys: ['cairo', 'egypt'],                                                 costMult: 0.65, cacMult: 0.70, label: 'Egypt' },
  { keys: ['bangkok', 'chiang mai', 'thailand'],                              costMult: 0.60, cacMult: 0.65, label: 'Thailand' },
  { keys: ['são paulo', 'sao paulo', 'rio de janeiro', 'brasilia', 'brazil'], costMult: 0.80, cacMult: 0.85, label: 'Brazil' },
  { keys: ['mexico city', 'cdmx', 'guadalajara', 'monterrey', 'mexico'],      costMult: 0.70, cacMult: 0.75, label: 'Mexico' },
  { keys: ['jakarta', 'surabaya', 'indonesia'],                               costMult: 0.55, cacMult: 0.60, label: 'Indonesia' },
  { keys: ['manila', 'cebu', 'philippines'],                                  costMult: 0.45, cacMult: 0.50, label: 'Philippines' },
  { keys: ['ho chi minh', 'hanoi', 'vietnam'],                                costMult: 0.42, cacMult: 0.48, label: 'Vietnam' },
  // Low cost — Africa & South Asia
  { keys: ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'pune', 'chennai', 'india'], costMult: 0.60, cacMult: 0.65, label: 'India' },
  { keys: ['karachi', 'lahore', 'islamabad', 'pakistan'],                     costMult: 0.38, cacMult: 0.43, label: 'Pakistan' },
  { keys: ['dhaka', 'chittagong', 'bangladesh'],                              costMult: 0.35, cacMult: 0.40, label: 'Bangladesh' },
  { keys: ['nairobi', 'mombasa', 'kenya'],                                    costMult: 0.45, cacMult: 0.50, label: 'Kenya' },
  { keys: ['lagos', 'abuja', 'port harcourt', 'nigeria'],                     costMult: 0.40, cacMult: 0.45, label: 'Nigeria' },
  { keys: ['accra', 'kumasi', 'ghana'],                                       costMult: 0.42, cacMult: 0.48, label: 'Ghana' },
  { keys: ['kampala', 'uganda'],                                              costMult: 0.38, cacMult: 0.43, label: 'Uganda' },
  { keys: ['dar es salaam', 'dodoma', 'tanzania'],                            costMult: 0.38, cacMult: 0.43, label: 'Tanzania' },
  { keys: ['kigali', 'rwanda'],                                               costMult: 0.40, cacMult: 0.45, label: 'Rwanda' },
  { keys: ['addis ababa', 'ethiopia'],                                        costMult: 0.36, cacMult: 0.42, label: 'Ethiopia' },
  { keys: ['dakar', 'senegal'],                                               costMult: 0.42, cacMult: 0.47, label: 'Senegal' },
  { keys: ['lusaka', 'zambia'],                                               costMult: 0.38, cacMult: 0.43, label: 'Zambia' },
  { keys: ['harare', 'zimbabwe'],                                             costMult: 0.35, cacMult: 0.40, label: 'Zimbabwe' },
];

export interface LocationEffect {
  costMult: number;
  cacMult: number;
  label: string | null;
}

/** Ported verbatim from index.html. */
export function detectLocation(locStr?: string): LocationEffect {
  if (!locStr) return { costMult: 1.0, cacMult: 1.0, label: null };
  const s = locStr.toLowerCase();
  for (const entry of LOCATION_COSTS) {
    if (entry.keys.some((k) => s.includes(k))) {
      return { costMult: entry.costMult, cacMult: entry.cacMult, label: entry.label };
    }
  }
  return { costMult: 1.0, cacMult: 1.0, label: null };
}
