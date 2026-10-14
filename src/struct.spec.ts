import { struct, record } from ".";

type ExpectNever<T extends never> = true;

describe("struct", () => {
  it("preserves keys and values", () => {
    const obj = { x: 1, y: 2 };
    const s = record(obj);
    expect(s).toEqual(obj);
  });

  it("returns the same object for shallow-equal input objects", () => {
    const a = record({ x: 1, y: 2 });
    const b = record({ x: 1, y: 2 });
    expect(a).toBe(b);
    expect(a === b).toBe(true);
  });

  it("is order-agnostic", () => {
    const a = record({ x: 1, y: 2 });
    const b = record({ y: 2, x: 1 });
    expect(a).toBe(b);
    expect(a === b).toBe(true);
  });

  it("returns different object if keys or values differ", () => {
    const s1 = record({ x: 1, y: 2 });
    const s2 = record({ x: 1, y: 3 });
    const s3 = record({ x: 1, y: 2, z: 3 });
    expect(s1).not.toBe(s2);
    type ExpectS1S2NoOverlap = ExpectNever<Extract<typeof s1, typeof s2>>;
    expect(s1).not.toBe(s3);
    expect(s1 === s3).toBe(false);
  });

  it("can be customised", () => {
    type Geocode = { lat: number; long: number };
    const geocode = record<Geocode>;
    const a = geocode({ lat: 1, long: 2 });
    const b = geocode({ lat: 1, long: 2 });
    expect(a).toBe(b);
  });


  it("returns frozen instances", () => {
    const s = record({ x: 1, y: 2 });
    expect(Object.isFrozen(s)).toBe(true);
    expect(() => {
      (s as any).x = 42;
    }).toThrow();
  });

  it("distinguishes between additional attributes", () => {
    const Point = record<{x: number, y: number}>;
    const p1 = Point({ x: 1, y: 2 });
    const p2_coords = { x: 1, y: 2, z: 3 };
    const p2 = Point(p2_coords);
    expect(p2).not.toBe(p1);
    expect(p2 !== p1).toBe(true);
  });
});

describe("structType", () => {
  it("returns a struct factory", () => {
    const Point = struct("x", "y");
    const p1 = Point({x: 1, y: 2});
    const p2 = Point({x: 1, y: 2, z: 3});
    const p3 = Point({x: 1, y: 3});
    expect(p2).toBe(p1);
    expect(p2 === p1).toBe(true);
    expect(p3).not.toBe(p1);
    type ExpectS1S2NoOverlap = ExpectNever<Extract<typeof p1, typeof p3>>;
  });
});
