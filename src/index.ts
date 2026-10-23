import InternCache from "./intern-cache.js";
import * as hash from "./hash.js";

type ToNumber<K> = K extends `${infer N extends number}` ? N : never;

type Labels = readonly string[];

type ValidLabels<L extends Labels> = L[number] &
  keyof (readonly unknown[]) extends never
  ? L
  : never;

type Tuple = readonly unknown[];

type TupleOfLabels<L extends Labels> = { [I in keyof L]: unknown };

type ObjectOf<L extends Labels, T extends TupleOfLabels<L>> = {
  [I in Extract<keyof L, `${number}`> as L[I]]: T[ToNumber<I>];
};

type TupleFromObject<L extends Labels, O extends object> = {
  [I in keyof L]: O[L[I] & keyof O];
};

export type TupleFactory<T extends Tuple = Tuple> = {
  <const T_ extends T>(...args: T_): T_;
  typed<T_ extends T>(...exemplar: T_ | []): TupleFactory<Readonly<T_>>;
};

export type StructFactory<L extends Labels, T extends TupleOfLabels<L>> = {
  <const T_ extends T>(...args: T_): Readonly<T_ & ObjectOf<L, T_>>;
  from<
    const O extends ObjectOf<L, T>,
    const T_ extends T & TupleFromObject<L, O>,
  >(
    arg: O,
  ): Readonly<ObjectOf<L, T_> & T_>;
  typed<T_ extends T>(...exemplar: T_ | []): StructFactory<L, Readonly<T_>>;
  typedFrom<O extends ObjectOf<L, T>>(
    ...args: [exemplar: O] | []
  ): StructFactory<L, { [I in keyof L]: O[L[I]] }>;
};

function tuplesEquivalent<T extends Tuple>(a1: T, a2: T): boolean {
  if (a2.length !== a1.length) return false;
  for (let i = 0; i < a1.length; i++) {
    if (!Object.is(a2[i], a1[i])) return false;
  }
  return true;
}

const defineTuple = <T extends Tuple>(): TupleFactory<T> => {
  const construct = <const T_ extends T>(...args: T_) =>
    _tupleCache.get<T_, T_>(args);
  const typed = <T_ extends T>(..._exemplar: T_ | []) =>
    defineTuple<Readonly<T_>>();
  return Object.assign(construct, { typed });
};

const defineStruct = <L extends Labels, T extends TupleOfLabels<L>>(
  cache: InternCache<
    number,
    TupleOfLabels<L>,
    Readonly<TupleOfLabels<L> & ObjectOf<L, TupleOfLabels<L>>>
  >,
  labels: L,
): StructFactory<L, T> => {
  const construct = <T_ extends T, O extends ObjectOf<L, T_>>(
    ...args: T_
  ): Readonly<T_ & O> => {
    return cache.get(args);
  };

  const fromTuple = <const T_ extends T>(
    ...args: T_
  ): Readonly<T_ & ObjectOf<L, T_>> => {
    return construct(...args);
  };

  const fromObject = <
    const O extends ObjectOf<L, T>,
    const T_ extends T & TupleFromObject<L, O>,
  >(
    arg: O,
  ): Readonly<ObjectOf<L, T_> & T_> => {
    const args = labels.map(
      (label) => arg[label as keyof O],
    );
    return construct<T_, ObjectOf<L, T_>>(...args as unknown as T_);
  };

  const typed = <T_ extends T>(..._exemplar: T_ | []) =>
    defineStruct<L, Readonly<T_>>(cache, labels);

  const typedFrom = <O extends ObjectOf<L, T>>(..._args: [exemplar: O] | []) =>
    defineStruct<L, { [I in keyof L]: O[L[I]] }>(cache, labels);

  return Object.assign(fromTuple, { from: fromObject, typed, typedFrom });
};

export const _tupleCache = new InternCache<number, Tuple, Tuple>(
  hash.valuesHash,
  tuplesEquivalent,
  Object.freeze,
);

export const tuple = defineTuple<Tuple>();

export const struct = <const L extends readonly string[]>(
  ...labels: ValidLabels<L>
) => {
  type O = TupleOfLabels<ValidLabels<L>> &
    ObjectOf<ValidLabels<L>, TupleOfLabels<ValidLabels<L>>>;
  const cacheInjestFn = (tuple: TupleOfLabels<L>) => {
    labels.forEach((label: L[number], index) => {
      (tuple as unknown as Record<string, unknown>)[label] = tuple[index];
    });
    return Object.freeze(tuple as O);
  };
  const cache = new InternCache<number, TupleOfLabels<L>, Readonly<O>>(
    hash.valuesHash,
    tuplesEquivalent,
    cacheInjestFn,
  );
  return defineStruct(cache, labels);
};
