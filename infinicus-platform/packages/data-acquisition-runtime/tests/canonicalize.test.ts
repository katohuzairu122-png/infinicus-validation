import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { canonicalizeRecord, hashRecord } from '../src/provenance/ProvenanceService.js';

describe('canonicalizeRecord', () => {
  it('sorts object keys lexicographically at every level', () => {
    const a = canonicalizeRecord({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalizeRecord({ a: 2, c: { y: 2, z: 1 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":{"y":2,"z":1}}');
  });

  it('preserves array element order (order is semantically significant)', () => {
    const a = canonicalizeRecord({ items: [1, 2, 3] });
    const b = canonicalizeRecord({ items: [3, 2, 1] });
    expect(a).not.toBe(b);
    expect(a).toBe('{"items":[1,2,3]}');
  });

  it('produces stable, distinguishable output for primitives', () => {
    expect(canonicalizeRecord(null)).toBe('null');
    expect(canonicalizeRecord(true)).toBe('true');
    expect(canonicalizeRecord(false)).toBe('false');
    expect(canonicalizeRecord(42)).toBe('42');
    expect(canonicalizeRecord('hi')).toBe('"hi"');
  });

  it('two structurally identical records with differently-ordered keys canonicalize identically', () => {
    const r1 = { name: 'Widget', price: 9.99, category: 'tools' };
    const r2 = { category: 'tools', price: 9.99, name: 'Widget' };
    expect(canonicalizeRecord(r1)).toBe(canonicalizeRecord(r2));
  });

  it('two structurally different records canonicalize differently', () => {
    expect(canonicalizeRecord({ a: 1 })).not.toBe(canonicalizeRecord({ a: 2 }));
  });
});

describe('hashRecord', () => {
  it('produces a 64-character lowercase hex SHA-256 digest', () => {
    const hash = hashRecord({ a: 1 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same canonical input', () => {
    expect(hashRecord({ a: 1, b: 2 })).toBe(hashRecord({ b: 2, a: 1 }));
  });

  it('differs for different input', () => {
    expect(hashRecord({ a: 1 })).not.toBe(hashRecord({ a: 2 }));
  });

  it('matches a known SHA-256 vector for a simple canonical string', () => {
    // canonicalizeRecord('hi') -> '"hi"' — verify against an independently
    // computable SHA-256 of that exact byte sequence.
    const expected = createHash('sha256').update('"hi"', 'utf8').digest('hex');
    expect(hashRecord('hi')).toBe(expected);
  });
});
