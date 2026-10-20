# tuple-ts

**Immutable interned tuples and named tuples for JavaScript and TypeScript.**

JavaScript normally compares arrays by reference:

```ts
[1, 2] === [1, 2]; // false
```

`tuple-ts` gives tuples value-based identity through *interning*:

```ts
import { tuple } from "tuple-ts";

tuple(1, 2) === tuple(1, 2); // true
```

Equivalent tuples created through the same tuple cache are canonicalised to the same object. Values are frozen, so their contents cannot change after interning. This makes tuples useful as composite `Map` keys, `Set` members, memoization keys, and immutable values in functional TypeScript.

`tuple-ts` also supports **named tuples** through `struct()`: values remain arrays with positional slots, while the declared labels are available as named properties.

**Zero dependencies · Less than 1 KB gzipped**

## Install

```bash
npm install tuple-ts
```

## Tuples

Create a tuple with narrow TypeScript inference:

```ts
import { tuple } from "tuple-ts";

const point = tuple(10, 20);
//    ^? readonly [10, 20]

point[0]; // 10
point[1]; // 20
Object.isFrozen(point); // true
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
tuple(10, 20) === tuple(10, 21); // false
tuple(10, 20) === tuple(20, 10); // false
```

Tuples are ordinary frozen arrays:

```ts
const t = tuple("hello", 42, true);

t.length;           // 3
t[0];               // "hello"
[...t];             // ["hello", 42, true]
Array.isArray(t);   // true
Object.isFrozen(t); // true
```

### Constraining a tuple factory with `.narrow()`

Use `.narrow()` to make a reusable factory whose arguments must satisfy a tuple type.

Specify the type explicitly:

```ts
const Point = tuple.narrow<[number, number]>();

const a = Point(10, 20);
const b = Point(10, 20);

a === b; // true
Point(10, "20"); // TypeScript error
```

You can also refine an existing fixed-length tuple factory using an exemplar. The exemplar is used to infer the constraint, not as a default value:

```ts
const Pair = tuple.narrow<[unknown, unknown]>();
const NumberPair = Pair.narrow([0, 0]);

NumberPair(10, 20); // OK
NumberPair(10, "20"); // TypeScript error
```

In this example, the parent factory establishes the two-slot shape, and the exemplar narrows the element types to numbers. `.narrow()` is a TypeScript constraint; it does not create a new cache. Narrowed factories continue to use the shared tuple cache, so equal tuple values are interned together regardless of which narrowed factory constructs them.

## Why is this useful?

### Composite `Map` keys

Without interning, separately constructed arrays don't work as value-based keys:

```ts
const map = new Map();

map.set([10, 20], "visited");
map.get([10, 20]); // undefined
```

With `tuple-ts`:

```ts
const map = new Map();

map.set(tuple(10, 20), "visited");
map.get(tuple(10, 20)); // "visited"
```

The tuple used for lookup is the same canonical object as the tuple used as the key. This is useful for coordinates, memoization keys, graph nodes, dynamic-programming states, and other composite values.

### `Set` of values

```ts
const visited = new Set();

visited.add(tuple(10, 20));

visited.has(tuple(10, 20)); // true
visited.has(tuple(10, 21)); // false
```

No serialization, stringification, or custom hashing is required.

## Nested tuples

Tuples can contain other interned tuples:

```ts
const a = tuple("matrix", tuple(1, 0), tuple(0, 1));
const b = tuple("matrix", tuple(1, 0), tuple(0, 1));

a === b; // true
```

Because the inner tuples are themselves canonicalised, the outer tuples can be interned as well.

```ts
const a = tuple("a", tuple("b", "c"));
const b = tuple("a", tuple("b", "c"));
const c = tuple("a", tuple("b", "d"));

a === b; // true
a === c; // false
```

## Named tuples with `struct()`

Use `struct()` when you want positional tuple storage with meaningful labels. Pass a readonly label list to create a reusable factory:

```ts
import { struct } from "tuple-ts";

const Point = struct(["x", "y"]).narrow<[number, number]>();

const p = Point(10, 20);

p[0]; // 10
p[1]; // 20
p.x;  // 10
p.y;  // 20

Array.isArray(p);   // true
Object.isFrozen(p); // true
```

The label order corresponds to the tuple slot order: the first label names slot `0`, the second names slot `1`, and so on. The named properties are added to the array when it is interned. They are own, enumerable properties and are frozen along with the array.

### Constructing from a named object with `.from()`

`.from()` accepts an object with the declared labels and creates the corresponding positional tuple:

```ts
const Point = struct(["x", "y"]).narrow<[number, number]>();

const a = Point.from({ x: 10, y: 20 });
const b = Point.from({ y: 20, x: 10 });

a === b; // true

a[0]; // 10
a.x;  // 10
```

The values are read in the schema's label order, regardless of the input object's property order. Extra properties on the input object are ignored:

```ts
const p = Point.from({ x: 10, y: 20, altitude: 100 });

p.x; // 10
p.y; // 20
```

The returned value contains the tuple slots and the schema's named properties, not the unrelated input properties.

### Constraining a struct factory

Use `.narrow()` to specify the tuple's positional types:

```ts
const Point = struct(["x", "y"]).narrow<[number, number]>();

Point(10, 20);   // OK
Point(10, "20"); // TypeScript error
```

Use `.narrowFrom()` when you want to express the value types by label instead:

```ts
type Coordinates = { x: number; y: number };

const Point = struct(["x", "y"]).narrowFrom<Coordinates>();

Point(10, 20);    // OK
Point(10, "20"); // TypeScript error
Point.from({ x: 10, y: 20 }); // OK
```

You can also provide a typed exemplar to `.narrowFrom()`:

```ts
const coordinateExample: Coordinates = { x: 0, y: 0 };
const Point = struct(["x", "y"]).narrowFrom(coordinateExample);
```

The exemplar establishes types; its values are not used as defaults. If you pass an inline `const` exemplar whose properties are literal values, those literal types may be preserved. Give the exemplar a widened type, or use an explicit generic argument, when you want types such as `number` rather than the literal type `0`.

Both `.narrow()` and `.narrowFrom()` preserve the cache associated with the original `struct()` schema. They refine the factory's TypeScript constraints rather than creating a new interning domain.

### Struct schemas and identity

Each call to `struct(labels)` creates a schema with its own intern cache. Factories narrowed from that schema share the cache, but separate calls to `struct()` create separate caches, even when given identical labels:

```ts
const PointA = struct(["x", "y"]).narrow<[number, number]>();
const PointB = struct(["x", "y"]).narrow<[number, number]>();

PointA(1, 2) === PointA(1, 2); // true
PointA(1, 2) === PointB(1, 2); // false
```

Struct identity is therefore scoped to the schema factory. Ordinary `tuple()` values use a separate, shared tuple cache and do not share identity with struct values, even when their indexed elements are equal.

### Choosing labels

Use distinct labels, and avoid labels that collide with array properties or indices. In particular, `"length"`, numeric-looking labels such as `"0"`, and method names such as `"map"` can conflict with normal array behaviour. The current implementation does not validate label names or duplicate labels, so callers should ensure labels are unique and suitable for named properties.

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

`tuple-ts` does not recursively compare arbitrary JavaScript objects. Nested tuples work well because they are themselves interned:

```ts
const a = tuple(tuple(1, 2));
const b = tuple(tuple(1, 2));

a === b; // true
```

Struct caches use the same shallow slot-value comparison, but each struct schema has its own cache. Within a schema, the label properties are determined by the schema; the indexed slot values determine which canonical tuple is returned.

## Immutable by design

Tuples and structs returned by `tuple-ts` are frozen. Freezing is shallow, just like `Object.freeze()`:

```ts
const details = { name: "Alice" };
const value = tuple(details);

details.name = "Bob"; // Allowed: the nested object itself is not frozen
```

The tuple's reference to `details` is unchanged, so its interned identity remains the same. If you need immutable nested values, construct those values with `tuple()` or `struct()` too.

## Garbage-collection friendly

Interning raises a natural question: *doesn't the cache grow forever?* The cache implementation uses weak references and finalization support so that values no longer referenced by the application can be reclaimed by the JavaScript garbage collector. Values are not intended to be kept alive forever simply because they were once constructed.

## When should I use it?

`tuple-ts` is useful when you want small immutable values with stable identity:

- Composite `Map` keys
- `Set` membership
- Memoization keys
- Graph and search states
- Coordinates and other multi-dimensional values
- Functional programming
- Immutable application state
- Named, slot-based values such as points or pairs

Use `tuple()` for positional values and `struct()` when the same kind of value benefits from stable field labels.

## Design

The intern cache uses hashing to find candidates, then checks exact shallow equality before reusing an existing value. Hash collisions therefore do not determine equality. Tuple element order matters. Struct label order defines the mapping between slots and names, and each schema has its own cache.

There are no runtime dependencies.

## License

ISC