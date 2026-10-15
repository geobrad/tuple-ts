import InternCache from "./intern-cache";
import * as hash from "./hash";

type NoExtraKeys<T, K extends PropertyKey> = T &
  Record<Exclude<keyof T, K>, never>;

type BaseKey = string | number;
type BaseTuple = readonly unknown[];
type BaseRecord<K extends BaseKey> = Record<K, unknown>;

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
  r1: Record<BaseKey, unknown>,
  r2: Record<BaseKey, unknown>,
): boolean {
  const r1Keys = Object.keys(r1);
  const r2Keys = Object.keys(r2);
  if (r2Keys.length !== r1Keys.length) return false;
  return r1Keys.every(
    k => Object.hasOwn(r2, k) && Object.is(r1[k], r2[k])
  )
}

const defineTuple = <T extends BaseTuple>() =>
  Object.assign(
    <const T_ extends T>(...t: T_) => _tupleCache.get(t),
    {
      like: <T_ extends T>(...exemplar: T_ | []) => defineTuple<T_>(),
    },
  );

const defineRecord = <K extends BaseKey, R extends BaseRecord<K>>(
  keys?: readonly K[],
) =>
  Object.assign(
    <const R_ extends R>(r: R_) =>
      _recordCache.get(
          Object.fromEntries(keys ? keys.map((k) => [k, r[k] as R_[K]]) : Object.entries(r))
      ) as Readonly<Pick<R_, Extract<keyof R_, K>>>,
    {
      like: <R_ extends R>(exemplar?: NoExtraKeys<R_, K>) =>
        defineRecord<K, R_>(keys),
    },
  );

export const _tupleCache = new InternCache(hash.valuesHash, arrayEquivalent);

export const _recordCache = new InternCache(
  (r) =>
    hash.valuesHash(
      (Object.keys(r) as Array<keyof typeof r>)
        .sort()
        .flatMap((k) => [k, r[k]]),
    ),
  recordEquivalent,
);

export const tuple = defineTuple();

export const record = defineRecord();

export const struct = <const K extends string>(...keys: readonly K[]) =>
  defineRecord(keys);
