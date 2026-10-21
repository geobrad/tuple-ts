export type Not<T> = [T] extends [never] ? false : never;

export type Assignable<A, B> = [A] extends [B] ? never : false;

export type Equivalent<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? never
    : false
  : false;

export const expect = <_T extends never>() => {};

expect<Assignable<string, string | number>>;
expect<Not<Assignable<string, "foo">>>;
expect<Equivalent<string, string>>;
expect<Not<Equivalent<"foo", "bar">>>;
