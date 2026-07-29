/** Ported verbatim from index.html's RANDOM section. */

export function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function rndi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function gauss(): number {
  let u: number, v: number;
  do { u = Math.random(); } while (!u);
  do { v = Math.random(); } while (!v);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function rNorm(mean: number, sd: number): number {
  return mean + gauss() * sd;
}
