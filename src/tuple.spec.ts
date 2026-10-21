import { tuple, _tupleCache } from ".";
import * as TT from "./type-testing";

type X = TT.Assignable<string, number>;

async function waitForGC(): Promise<void> {
  await new Promise((res) => setTimeout(res, 10));
  (global as any).gc(); // requires node --expose-gc
  await new Promise((res) => setTimeout(res, 10));
}

test("Empty tuples", () => {
  const a = tuple();
  const b = tuple();
  expect(b).toBe(a); // identity
  expect(a === b).toBe(true); // equality
});

test("Indexability", () => {
  const a = {};
  const t = tuple(42, "blah", a);
  expect(t[0]).toBe(42);
  expect(t[1]).toBe("blah");
  expect(t[2]).toBe(a);
  TT.expect<TT.Equivalent<typeof t, readonly [42, "blah", {}]>>;
});

test("Iterability", () => {
  const a = {};
  const t = tuple(42, "blah", a);
  expect(typeof t[Symbol.iterator]).toBe("function");
  expect([...t]).toEqual([42, "blah", a]);
});

test("Basic interned equality (if same input, same object)", () => {
  const a = {};
  const f = () => {};
  const t1 = tuple(a, f, 42, "hi", undefined, true, null, 7839278492n);
  const t2 = tuple(a, f, 42, "hi", undefined, true, null, 7839278492n);
  expect(t1).toBe(t2); // identity
  expect(t1 === t2).toBe(true); // equality
});

test("Referential inequality (same structure, different references)", () => {
  const t1 = tuple({}, 42);
  const t2 = tuple({}, 42);
  expect(t1).not.toBe(t2); // non-identity
  expect(t1 === t2).toBe(false); // non-equality
});

test("Different-length tuples are different tuples", () => {
  const t1 = tuple(1, 2);
  const t2 = tuple(1, 2, 3);
  const t3 = tuple(1, 2, undefined);
  expect(t1).not.toBe(t2);
  expect(t1).not.toBe(t3);
});

test("Nestable", () => {
  const t1 = tuple("a", tuple("b1", "b2"), "c");
  const t2 = tuple("a", tuple("b1", "b2"), "c");
  const t3 = tuple("a", tuple("b1", "b3"), "c");
  expect(t2).toBe(t1);
  expect(t1 === t2).toBe(true);
  expect(t3).not.toBe(t1);
  TT.expect<TT.Equivalent<Extract<typeof t3, typeof t2>, never>>;
});

test("NaN is equivalent to itself", () => {
  expect(tuple(NaN)).toBe(tuple(NaN));
  expect(tuple(NaN) === tuple(NaN)).toBe(true);
});

test("NaN values with different bit representations are interned as identical", () => {
  // Construct NaN with payload 1
  const view1 = new DataView(new ArrayBuffer(8));
  view1.setUint32(0, 0x7ff80000);
  view1.setUint32(4, 0x00000001);
  const nan1 = view1.getFloat64(0);
  // Construct NaN with payload 2
  const view2 = new DataView(new ArrayBuffer(8));
  view2.setUint32(0, 0x7ff80000);
  view2.setUint32(4, 0x00000002);
  const nan2 = view2.getFloat64(0);
  // Verify they are both recognized as NaNs and Object.is equivalent:
  expect(Number.isNaN(nan1)).toBe(true);
  expect(Number.isNaN(nan2)).toBe(true);
  expect(Object.is(nan1, nan2)).toBe(true);
  // If NaNs were not canonicalized in numberToUint32s, this would fail (.not.toBe)
  // because nan1 and nan2 would hash to different buckets:
  expect(tuple(nan1)).toBe(tuple(nan2));
  expect(tuple(nan1) === tuple(nan2)).toBe(true);
});

test("Positive and negative zero are distinct", () => {
  const t1 = tuple(+0);
  const t2 = tuple(-0);
  expect(t1).not.toBe(t2);
  expect(t1 === t2).toBe(false);
  expect(tuple(+0)).not.toBe(tuple(-0));
  expect(tuple(+0) === tuple(-0)).toBe(false);
});

test("Tuple cache entry is cleared when tuple is garbage-collected", async () => {
  _tupleCache.reset();
  expect(_tupleCache.size).toBe(0);

  type Point = [number, number];
  const Point = tuple<Point>;
  Point(15, 42);
  expect(_tupleCache.size).toBe(1);

  await waitForGC();

  expect(_tupleCache.size).toBe(0);
});

test("Tuples are frozen", () => {
  const t = tuple(1, 2, 3);
  expect(Object.isFrozen(t)).toBe(true);
  expect(() => {
    (t as any)[0] = 42;
  }).toThrow();
});

test("Tuples can be narrowed by generic type argument", () => {
  type Point = [number, number];
  const Point = tuple.narrow<Point>();
  TT.expect<TT.Equivalent<Parameters<typeof Point>, [number, number]>>;
  expect(Point(1,2)).toBe(tuple(1,2));
});

test("Tuples can be narrowed by exemplar", () => {
  const Point = tuple.narrow(0, 0);
  TT.expect<TT.Equivalent<Parameters<typeof Point>, [number, number]>>;
  expect(Point(1,2)).toBe(tuple(1,2));
});
