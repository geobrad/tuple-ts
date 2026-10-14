import InternCache from "./intern-cache";
import * as hash from "./hash";

function arrayEquivalent(
  a1: readonly unknown[],
  a2: readonly unknown[],
): boolean {
  if (a2.length !== a1.length) return false;
  for (let i = 0; i < a1.length; i++) {
    if (!Object.is(a2[i], a1[i])) return false;
  }
  return true;
}

function recordEquivalent(
  r1: Record<string, unknown>,
  r2: Record<string, unknown>,
): boolean {
  const r1Keys = Object.keys(r1);
  const r2Keys = Object.keys(r2);
  if (r2Keys.length !== r1Keys.length) return false;
  for (let i = 0; i < r1Keys.length; i++) {
    const k = r1Keys[i];
    if (!(k in r2)) return false;
    if (!Object.is(r2[k], r1[k])) return false;
  }
  return true;
}

export const _tupleCache = new InternCache(
  hash.valuesHash,
  arrayEquivalent,
  (x) => Object.freeze(x),
);

export const _recordCache = new InternCache(
  (r) =>
    hash.valuesHash(
      (Object.keys(r) as Array<keyof typeof r>)
        .sort()
        .flatMap((k) => [k, r[k]]),
    ),
  recordEquivalent,
  (x) => Object.freeze(x),
);

export const tuple = <const T extends readonly unknown[]>(...t: T) =>
  _tupleCache.get(t);

export const record = <const T extends Record<string, unknown>>({ ...r }: T) =>
  _recordCache.get(r);

export class DuplicateKeyError extends Error {
  override readonly name = "DuplicateKeyError";
  constructor() {
    super("All keys must be distinct.");
  }
}

export const struct = <const K extends Array<string>>(...keys: K) => {
  keys.forEach((k) => {
    if (typeof k !== "string") {
      throw new TypeError("All keys must be strings.");
    }
  });
  if (new Set(keys).size !== keys.length) {
    throw new DuplicateKeyError();
  }
  const cache = new InternCache<number, Record<K[number], unknown>>(
    (s) => hash.valuesHash(keys.map((k: K[number]) => s[k])),
    (s1, s2) => keys.every((k: K[number]) => Object.is(s1[k], s2[k])),
    <T extends Record<K[number], unknown>>(r: T) =>
      Object.fromEntries(keys.map((k: K[number]) => [k, r[k]])) as T,
  );
  return <const T extends Record<K[number], unknown>>(s: T) =>
    cache.get(
      Object.fromEntries(keys.map((k: K[number]) => [k, s[k]])) as Pick<
        T,
        K[number]
      >,
    );
};
