import InternCache from "./intern-cache";
import * as hash from "./hash";

type BaseTuple = readonly unknown[];
type BaseLabels = readonly string[];

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

const defineTuple = <T extends BaseTuple>() => {
  const construct = <const T_ extends T>(...args: T_) =>
    _tupleCache.get<T_, T_>(args);
  const narrow = <T_ extends T>(..._args: [exemplar: T_] | []) =>
    defineTuple<T_>();
  return Object.assign(construct, { narrow });
};

type ObjectOf<T extends BaseTuple, L extends BaseLabels> = {
  [I in Extract<
    keyof L,
    `${number}`
  > as L[I]]: T[I extends `${infer N extends number}` ? N : never];
};
type StructOf<T extends BaseTuple, L extends BaseLabels> = Readonly<
  T & ObjectOf<T, L>
>;
type TupleFromObject<
  T extends BaseTuple,
  L extends BaseLabels,
  O extends ObjectOf<T, L>,
> = T & { [I in keyof L]: O[L[I]] };

type StructFactory<T extends BaseTuple, L extends BaseLabels> = (<
  const T_ extends T,
>(
  ...args: T_
) => StructOf<T_, L>) & {
  from: <const O extends ObjectOf<T, L>>(
    arg: O,
  ) => Readonly<O & TupleFromObject<T, L, O>>;
  narrow: <const T_ extends T>() => StructFactory<T_, L>;
  narrowFrom: <
    const O extends ObjectOf<T, L>,
    // const T_ extends TupleFromObject<T, L, O>,
  >(
    ..._args: [exemplar: O] | []
  ) => StructFactory<{ [I in keyof L]: O[L[I]] }, L>;
};

const defineStruct = <T extends BaseTuple, L extends BaseLabels>(
  cache: InternCache<
    number,
    BaseTuple,
    Readonly<BaseTuple & ObjectOf<BaseTuple, L>>
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

  const narrow = <const T_ extends T>(..._args: [exemplar: T_] | []) =>
    defineStruct<T_, L>(cache, labels);

  const narrowFrom = <
    const O extends ObjectOf<T, L>,
  >(
    ..._args: [exemplar: O] | []
  ) => defineStruct<{ [I in keyof L]: O[L[I]] }, L>(cache, labels);

  return Object.assign(fromTuple, { from: fromObject, narrow, narrowFrom });
};

export const _tupleCache = new InternCache(
  hash.valuesHash,
  arrayEquivalent,
  Object.freeze,
);

export const tuple = defineTuple<BaseTuple>();

export const struct = <const L extends readonly string[]>(labels: L) => {
  const cacheInjestFn = (tuple: BaseTuple) => {
    type T = BaseTuple & ObjectOf<BaseTuple, L>;
    const labeledTuple = tuple as T;
    labels.forEach((label: keyof T, index) => {
      labeledTuple[label] = tuple[index] as T[keyof T];
    });
    return Object.freeze(labeledTuple);
  };
  const cache = new InternCache(
    hash.valuesHash,
    arrayEquivalent,
    cacheInjestFn,
  );
  return defineStruct(cache, labels);
};
