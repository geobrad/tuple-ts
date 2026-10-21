# tuple-ts

**TypeScript-first tuples and structs with value-based identity.**

JavaScript normally compares arrays by reference: 

```ts
[1, "foo"] === [1, "foo"]; // false!
```

`tuple-ts` provides opt-in _value-based identity_:

```ts
import { tuple } from "tuple-ts";

tuple(1, "foo") === tuple(1, "foo");  // true
```

with optional slot labels:

```ts
import { struct } from "tuple-ts";

const Person = struct(["name", "age"]);

const person1 = Person("Bob", 25);

person1[0] === "Bob";   // true
person1.name === "Bob"; // true
```

and support for label-based construction:

```ts
const person2 = Person.from({ name: "Bob", age: 25 });

person1 === person2;    // true
```

`tuple-ts` is useful when you want small immutable values with stable identity:

- Composite `Map` and `Set` keys
- Memoization keys
- Graph and search states
- Coordinates and other multi-dimensional values
- Named, slot-based values such as points or pairs

`tuple-ts` has zero dependencies and is just a few kilobytes gzipped.

## Install

```bash
npm install tuple-ts
```

## Tuples

The values returned by `tuple(...)` are regular frozen JavaScript arrays:

```ts
const tuple1 = tuple(1, "foo");

Array.isArray(tuple1);   // true
tuple1.length === 2;     // true
tuple1[0] === 1;         // true
tuple1[1] === "foo";     // true
Object.isFrozen(tuple1); // true
[ ...tuple1 ];           // [1, "foo"]
```

...with automatically inferred literal types:

```ts
type Tuple1 = typeof tuple1; // readonly [1, "foo"]
```

Type-narrowed tuple factories are also supported:

```ts
type Point = [number, number];
const Point = tuple.typed<Point>();
// Or equivalently, using an exemplar:
// const Point = tuple.typed(0, 0);

type P = Parameters<typeof Point>; // [number, number];
```

Calling `tuple()` again with the same values returns the same canonical object:

```ts
const a = tuple(10, 20);
const b = tuple(10, 20);

a === b; // true
Object.is(a, b); // true
```

Different values or a different element order produce different tuples:

```ts
tuple(10, 20) === tuple(10, 21); // false!
tuple(10, 20) === tuple(20, 10); // false!
```

### Constraining a tuple factory with `.typed()`

Use `.typed()` to make a reusable tuple factory whose arguments must satisfy a nominated tuple type.

Specify the type explicitly:

```ts
const Point = tuple.typed<[number, number]>();

Point(10, 20);   // OK
Point(10, "20"); // TypeScript error
```

You can alternatively provide an exemplar from which the type constraint will be inferred:

```ts
const NumberPair = tuple.typed(0, 0);

NumberPair(10, 20);   // OK
NumberPair(10, "20"); // TypeScript error
```


### Nesting tuples

Tuples can contain other interned tuples:

```ts
const a = tuple("a", tuple("b", "c"));
const b = tuple("a", tuple("b", "c"));
const c = tuple("a", tuple("b", "d"));

a === b; // true
a === c; // false!

const mat1 = tuple("matrix", tuple(1, 0), tuple(0, 1));
const mat2 = tuple("matrix", tuple(1, 0), tuple(0, 1));

mat1 === mat2; // true
```

## Structs

Use `struct()` when you want a tuple with meaningful labels.
Provide a list of labels to create a reusable factory that produces tuples with additional named properties.

```ts
import { struct } from "tuple-ts";

const Point = struct(["x", "y"]);

const p = Point(10, 20);

p[0]; // 10
p[1]; // 20
p.x;  // 10
p.y;  // 20

Array.isArray(p);   // true!
Object.isFrozen(p); // true
[ ...p ];           // [10, 20]
{ ...p };           // { 0: 10, 1: 20, x: 10, y: 20 }
```

### Constructing from an object with `.from()`

`.from()` accepts an object with the declared labels and creates the corresponding positional tuple:

```ts
const Point = struct(["x", "y"]);

const point1 = Point.from({ x: 10, y: 20 });

point1 === Point(10, 20); // true
point1[0] === 10;         // true
point1.x === 10;          // true
```

The values are read in the schema's label order, regardless of the input object's property order. Extra properties on the input object are ignored:

```ts
const p = Point.from({ x: 10, y: 20, altitude: 100 });

p.x; // 10
p.y; // 20
```

The returned value contains the tuple slots and the schema's named properties, not the unrelated input properties.

### Constraining a struct factory

Just like `tuple`, structs support `.typed()` to specify the struct's value types positionally:

```ts
const Point = struct(["x", "y"]).typed<[number, number]>();

Point(10, 20);   // OK
Point(10, "20"); // TypeScript error
```

Use `.typedFrom()` when you want to express the value types by label instead:

```ts
type Coordinates = { x: number; y: number };

const Point = struct(["x", "y"]).typedFrom<Coordinates>();

Point(10, 20);    // OK
Point(10, "20");  // TypeScript error
Point.from({ x: 10, y: 20 }); // OK
```

You can also provide a typed exemplar to `.typedFrom()`:

```ts
const Point = struct(["x", "y"]).typedFrom({ x: 0, y: 0 });
```

### Struct schemas and identity

Each call to `struct(labels)` creates its own cache. Factories narrowed from that schema with `.typed()` or `.typedFrom()` share the cache, but separate calls to `struct()` create separate caches, even when given identical labels:

```ts
const PointA = struct(["x", "y"]).typed<[number, number]>();
const PointB = struct(["x", "y"]).typed<[number, number]>();

PointA(1, 2) === PointA(1, 2); // true
PointA(1, 2) === PointB(1, 2); // false
```

Struct identity is therefore scoped to the schema factory. Ordinary `tuple()` values use a separate, shared tuple cache and do not share identity with struct values, even when their indexed elements are equal.

## Tuples and structs as composite keys for `Map` and `Set`

`tuple` and `struct` let you use composite keys with JavaScript's built-in `Map` and `Set`, without serialization or stringification.

JavaScript's `Map` and `Set` treat separately constructed arrays as distinct keys, even when their contents are equal:

```ts
const myMap = new Map();
myMap.set([10, 20], "visited");

myMap.has([10, 20]);  // false!
myMap.get([10, 20]);  // undefined!

const mySet = new Set();
mySet.add([10, 20]);

mySet.has([10, 20]);  // false!
```

With `tuple-ts`:

```ts
const myMap = new Map();
myMap.set(tuple(10, 20), "visited");

myMap.has(tuple(10, 20)); // true
myMap.get(tuple(10, 20)); // "visited"

const Point = struct(["x", "y"]);
const mySet = new Set();
mySet.add(Point(1, 2));

mySet.has(Point(1, 2)); // true
```

## Equality semantics

Tuple elements are compared shallowly using `Object.is`:

```ts
tuple(NaN) === tuple(NaN); // true
tuple(+0) === tuple(-0);   // false
```

Object-valued elements retain JavaScript's normal reference identity:

```ts
const value = { x: 1 };
tuple(value) === tuple(value); // true

tuple({ x: 1 }) === tuple({ x: 1 }); // false
```

`tuple-ts` does not recursively compare arbitrary JavaScript objects. Nested tuples work well because the values are themselves tuples:

```ts
const a = tuple(tuple(1, 2));
const b = tuple(tuple(1, 2));

a === b; // true
```

## Garbage Collection

`tuple-ts` works by maintaining internal caches of tuple/struct objects. This raises a natural question: *doesn't the cache grow forever?*

The cache uses `WeakRef` to avoid keeping interned objects alive solely because they are cached. A `FinalizationRegistry` is used to clean up cache entries after objects are garbage-collected. This allows unreferenced values to be reclaimed without the cache retaining them indefinitely.

## License

ISC