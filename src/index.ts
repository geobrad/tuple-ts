import InternCache from "./intern-cache.js";
import * as hash from "./hash.js";

type Tuple = readonly unknown[];
type Labels = readonly string[];

type NumericKeyOf<T> = keyof T & (number | `${number}`);
type ToNumber<K> = K extends `${infer N extends number}` ? N : never;

type J = NumericKeyOf<[1, 2]>;
type K = number extends keyof { 1: "blah" } ? true : false;
type X = "1" extends keyof [1, 2] ? true : false;

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

export type TupleFactory<T extends Tuple = Tuple> = {
  <const T_ extends T>(...args: T_): T_;
  typed<T_ extends T>(...exemplar: T_ | []): TupleFactory<Readonly<T_>>;
};

const defineTuple = <T extends Tuple>(): TupleFactory<T> => {
  const construct = <const T_ extends T>(...args: T_) =>
    _tupleCache.get<T_, T_>(args);
  const typed = <T_ extends T>(..._exemplar: T_ | []) => defineTuple<Readonly<T_>>();
  return Object.assign(construct, { typed });
};

type ObjectOf<T extends Tuple, L extends Labels> = {
  [I in NumericKeyOf<L> as L[I]]: T[ToNumber<I>];
};

type TupleFromObject<
  T extends Tuple,
  L extends Labels,
  O extends ObjectOf<T, L>,
> = T & { [I in keyof L]: O[L[I]] };

export type StructFactory<T extends Tuple, L extends Labels> = {
  <const T_ extends T>(...args: T_): Readonly<T_ & ObjectOf<T_, L>>;
  from<
    const O extends ObjectOf<T, L>,
    const T_ extends TupleFromObject<T, L, O>,
  >(
    arg: O,
  ): Readonly<ObjectOf<T_, L> & T_>;
  typed<T_ extends T>(...exemplar: T_ | []): StructFactory<Readonly<T_>, L>;
  typedFrom<O extends ObjectOf<T, L>>(
    ...args: [exemplar: O] | []
  ): StructFactory<{ [I in keyof L]: O[L[I]] }, L>;
};

const defineStruct = <T extends Tuple, L extends Labels>(
  cache: InternCache<
    number,
    Tuple,
    Readonly<Tuple & ObjectOf<Tuple, L>>
  >,
  labels: L,
): StructFactory<T, L> => {
  const construct = <T_ extends T, O extends ObjectOf<T_, L>>(
    ...args: T_
  ): Readonly<T_ & O> => {
    return cache.get(args);
  };

  const fromTuple = <const T_ extends T>(
    ...args: T_
  ): Readonly<T_ & ObjectOf<T_, L>> => {
    return construct(...args);
  };

  const fromObject = <
    const O extends ObjectOf<T, L>,
    const T_ extends TupleFromObject<T, L, O>,
  >(
    arg: O,
  ): Readonly<ObjectOf<T_, L> & T_> => {
    const args = labels.map((label: L[number]) => arg[label]) as unknown as T_;
    return construct<T_, ObjectOf<T_, L>>(...args);
  };

  const typed = <T_ extends T>(..._exemplar: T_ | []) =>
    defineStruct<Readonly<T_>, L>(cache, labels);

  const typedFrom = <O extends ObjectOf<T, L>>(..._args: [exemplar: O] | []) =>
    defineStruct<{ [I in keyof L]: O[L[I]] }, L>(cache, labels);

  return Object.assign(fromTuple, { from: fromObject, typed, typedFrom });
};

export const _tupleCache = new InternCache(
  hash.valuesHash,
  arrayEquivalent,
  Object.freeze,
);

export const tuple = defineTuple<Tuple>();

export const struct = <const L extends readonly string[]>(...labels: L) => {
  const cacheInjestFn = (tuple: Tuple) => {
    type O = ObjectOf<Tuple, L>;
    labels.forEach((label: keyof O, index) => {
      (tuple as O)[label] = tuple[index] as O[keyof O];
    });
    return Object.freeze(tuple as O & Tuple);
  };
  const cache = new InternCache(
    hash.valuesHash,
    arrayEquivalent,
    cacheInjestFn,
  );
  return defineStruct(cache, labels);
};
