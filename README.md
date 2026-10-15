# tuple-ts

**Immutable tuples, records and structs with value-based identity for JavaScript and TypeScript.**

JavaScript normally compares arrays and objects by reference:

```ts
[1, 2] === [1, 2] // false

({ x: 1 }) === ({ x: 1 }) // false
```

`tuple-ts` gives you a different model:

```ts
tuple(1, 2) === tuple(1, 2) // true

record({ x: 1 }) === record({ x: 1 }) // true
```

Equal values are **interned to the same object**.

That makes tuples, records and structs immutable, naturally usable as composite `Map` keys and `Set` values, and particularly pleasant to use in functional TypeScript.

**Zero dependencies · Less than 1 KB gzipped**

## Install

```bash
npm install tuple-ts
```

## Tuples

Create an immutable tuple with full TypeScript inference:

```ts
import { tuple } from "tuple-ts";

const point = tuple(10, 20);
//    ^? readonly [10, 20]

console.log(point[0]); // 10
console.log(point[1]); // 20
```

Calling `tuple` again with the same values gives you the **same object**:

```ts
const a = tuple(10, 20);
const b = tuple(10, 20);

a === b; // true
Object.is(a, b); // true
```

Different values give you different objects:

```ts
tuple(10, 20) === tuple(10, 21); // false
tuple(10, 20) === tuple(20, 10); // false
```

Tuples are ordinary frozen arrays, so there is no special API to learn:

```ts
const t = tuple("hello", 42, true);

t.length;           // 3
t[0];               // "hello"
[...t];             // ["hello", 42, true]
Object.isFrozen(t); // true
```

## Why is this useful?

### Composite `Map` keys

JavaScript doesn't have value-based arrays, so this doesn't work:

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

The tuple constructed during the lookup is the same canonical object as the tuple used as the key.

This is particularly useful for things like coordinates, memoization keys, graph nodes, dynamic-programming states, and other composite values.

### `Set` of values

The same applies to `Set`:

```ts
const visited = new Set();

visited.add(tuple(10, 20));

visited.has(tuple(10, 20)); // true
visited.has(tuple(10, 21)); // false
```

No serialization, stringification, or custom hashing is required.

## Nested tuples

Tuples can be nested:

```ts
const a = tuple(
  "matrix",
  tuple(1, 0),
  tuple(0, 1),
);

const b = tuple(
  "matrix",
  tuple(1, 0),
  tuple(0, 1),
);

a === b; // true
```

Because nested tuples themselves have value-based identity, the resulting structures are canonicalised naturally.

```ts
const a = tuple("a", tuple("b", "c"));
const b = tuple("a", tuple("b", "c"));
const c = tuple("a", tuple("b", "d"));

a === b; // true
a === c; // false
```

## Typed tuples

Use `tuple.like()` to create a reusable constructor for a particular tuple type.

### Inferring the type from an exemplar

```ts
const Point = tuple.like(0, 0);

const a = Point(10, 20);
const b = Point(10, 20);

a === b; // true
```

The exemplar determines the TypeScript type expected by the resulting factory. Its values are not used as defaults.

By default, TypeScript widens the exemplar's literal types, so `tuple.like(0, 0)` produces a factory accepting two numbers.

### Explicit type arguments

Alternatively, specify the type directly:

```ts
type Point = [x: number, y: number];

const Point = tuple.like<Point>();

const a = Point(10, 20);
const b = Point(10, 20);

a === b; // true
```

No exemplar is required when the type argument is provided explicitly.

### Preserving literal types

To preserve literal types rather than widen them, use `as const`:

```ts
const Direction = tuple.like("north" as const, 1 as const);

Direction("north", 1); // OK
Direction("south", 1); // TypeScript error
```

In all cases, the resulting tuples are frozen and interned using the same shared cache as ordinary tuples.

## Records

`record` provides the same value-based identity semantics for objects:

```ts
import { record } from "tuple-ts";

const a = record({
  id: 1,
  role: "admin",
});

const b = record({
  role: "admin",
  id: 1,
});

a === b; // true
```

Property order does not matter.

Records are frozen:

```ts
Object.isFrozen(a); // true
```

And they work naturally as `Map` keys:

```ts
const users = new Map();

users.set(
  record({ id: 42, role: "admin" }),
  "Alice",
);

users.get(
  record({ role: "admin", id: 42 }),
); // "Alice"
```

### Record identity

A record's identity is determined by its own, enumerable, string-keyed properties and their values.

Two records are equivalent if they contain exactly the same keys, with equivalent values, regardless of property order.

```ts
record({ x: 1, y: 2 }) ===
record({ y: 2, x: 1 }); // true

record({ x: 1 }) ===
record({ x: 1, y: 2 }); // false
```

Symbol-keyed, inherited and non-enumerable properties are not copied into records.

Numeric property keys are supported and follow JavaScript's normal conversion to string keys.

### Typed records

Use `record.like()` to create a reusable typed record constructor:

```ts
interface User {
  id: string;
  name: string;
  updatedAt: number;
}

const User = record.like<User>();

const a = User({
  id: "alice",
  name: "Alice",
  updatedAt: 1000,
});

const b = User({
  name: "Alice",
  id: "alice",
  updatedAt: 1000,
});

a === b; // true
```

Alternatively, infer the type from an exemplar:

```ts
const User = record.like({
  id: "",
  name: "",
  updatedAt: 0,
});
```

As with `tuple.like()`, the exemplar defines the type; it does not supply default values.

The resulting factory requires the properties established by `like()`, but may also accept additional properties.

Unlike `struct`, `record` preserves those additional properties, and they contribute to identity.

```ts
const User = record.like({ id: "" });

const a = User({ id: "alice" });
const b = User({ id: "alice", role: "admin" });

a === b; // false
```

## Structs

`record` interns whatever properties you give it. If you want a fixed set of keys to define identity, use `struct`.

`struct` takes key names as arguments and returns a factory. The factory accepts any object with at least those keys, extracts **exactly the declared keys**, and interns the result.

```ts
import { struct } from "tuple-ts";

const Point = struct("x", "y");

const a = Point({ x: 1, y: 2 });
const b = Point({ x: 1, y: 2 });

a === b; // true
```

### Additional properties are discarded

Unlike `record`, a struct factory ignores properties that are not part of its declared structure:

```ts
const Point = struct("x", "y");

const a = Point({ x: 1, y: 2 });
const b = Point({ x: 1, y: 2, z: 3 });

a === b; // true
```

The resulting objects contain only `x` and `y`:

```ts
Object.keys(b); // ["x", "y"]

b.z; // TypeScript error
```

This makes structs useful for projecting larger objects into canonical values with a precisely defined shape.

```ts
const Position = struct("x", "y");

const location = {
  x: 10,
  y: 20,
  altitude: 100,
  timestamp: Date.now(),
};

const position = Position(location);
// { x: 10, y: 20 }
```

The factory is deliberately permissive about additional input properties, but strict about which properties appear in its output.

### Typed structs

Use `struct(...keys).like()` to constrain the types of the declared properties.

The type can be inferred from an exemplar:

```ts
const Point = struct("x", "y").like({
  x: 0,
  y: 0,
});

Point({ x: 10, y: 20 });    // OK
Point({ x: "10", y: 20 });  // TypeScript error
```

Or provided explicitly:

```ts
type Coordinates = {
  x: number;
  y: number;
};

const Point = struct("x", "y").like<Coordinates>();

Point({ x: 10, y: 20 }); // OK
```

As with the other factories, `like()` defines types, not default values.

### Strict definitions, flexible construction

There is an intentional distinction between defining a struct and constructing one.

A `like()` exemplar must contain only the keys declared by `struct`:

```ts
const Point = struct("x", "y");

Point.like({
  x: 0,
  y: 0,
  z: 0, // TypeScript error: unexpected property
});
```

But the resulting factory accepts extra properties and discards them:

```ts
const Point = struct("x", "y").like({
  x: 0,
  y: 0,
});

Point({ x: 10, y: 20, z: 30 }); // OK
// { x: 10, y: 20 }
```

This keeps struct definitions precise without making callers manually remove unrelated properties from their input objects.

## Equality semantics

Values are compared using [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is):

```ts
tuple(NaN) === tuple(NaN); // true

tuple(+0) === tuple(-0);   // false
```

Object values retain JavaScript's normal identity semantics.

The same object is the same value:

```ts
const value = { x: 1 };

tuple(value) === tuple(value); // true
```

Two separately created objects are different values:

```ts
tuple({ x: 1 }) === tuple({ x: 1 }); // false
```

This is **shallow equality**. `tuple-ts` does not recursively compare arbitrary JavaScript objects.

Nested tuples, records and structs work particularly well because they are themselves canonical values:

```ts
const a = record({
  position: tuple(10, 20),
});

const b = record({
  position: tuple(10, 20),
});

a === b; // true
```

The outer records compare equal because the inner tuples have already been interned to the same object.

All three constructors share this model of identity.

## Immutable by design

Tuples, records and structs returned by `tuple-ts` are frozen:

```ts
const point = tuple(10, 20);
const user = record({ id: 1 });
const position = struct("x", "y")({ x: 1, y: 2 });

Object.isFrozen(point);    // true
Object.isFrozen(user);     // true
Object.isFrozen(position); // true
```

This is important to the identity semantics: once a value has been interned, its own properties cannot subsequently change while it is being used as a `Map` key or `Set` member.

Freezing is shallow. If an interned value contains a reference to an ordinary mutable object, that nested object is not automatically frozen.

For example:

```ts
const details = { name: "Alice" };
const user = record({ details });

details.name = "Bob"; // Allowed
```

The reference to `details` remains unchanged, so the interned record retains its identity.

If you need immutable nested values, construct them using `tuple`, `record` or `struct` as well.

## Garbage-collection friendly

Interning values creates a natural question: *doesn't the cache grow forever?*

`tuple-ts` uses `WeakRef` and `FinalizationRegistry` internally. Cached values are weakly referenced, allowing the JavaScript garbage collector to reclaim values that are no longer referenced by the application.

In other words, you don't have to manually maintain a global cache of every tuple, record or struct you've ever created.

## TypeScript first

`tuple`, `record` and `struct` are designed to preserve TypeScript's inference.

### Literal inference

By default, constructors preserve literal types:

```ts
const t = tuple("hello", 42, true);
// readonly ["hello", 42, true]

const r = record({ x: 1, y: 2 });
// readonly properties x: 1, y: 2
```

### Reusable typed factories

Use `.like()` to define reusable constructors:

```ts
const Pair = tuple.like("", 0);

const User = record.like({
  id: "",
  name: "",
});

const Point = struct("x", "y").like({
  x: 0,
  y: 0,
});
```

Or specify types explicitly:

```ts
const Pair = tuple.like<[string, number]>();

const User = record.like<{
  id: string;
  name: string;
}>();

const Point = struct("x", "y").like<{
  x: number;
  y: number;
}>();
```

In either form, TypeScript checks arguments to the resulting factories.

### Readonly results

All constructors return readonly types, reflecting the frozen runtime objects.

The readonly typing is shallow, just like `Object.freeze()`.

## When should I use it?

`tuple-ts` is particularly useful when you want **small immutable values with stable identity**:

- Composite `Map` keys
- `Set` membership
- Memoization keys
- Graph/search states
- Coordinates and other multi-dimensional values
- Functional programming
- Immutable application state
- Canonical representations of frequently repeated values

Choose between the three constructors according to your data:

| Constructor | Shape | Identity |
|---|---|---|
| `tuple` | Ordered sequence | Position and value of each element |
| `record` | Arbitrary object properties | Complete set of keys and values |
| `struct` | Fixed declared keys | Values of the declared keys only |

If you just need an ordinary mutable array or object, use one. `tuple-ts` is for when you want the thing to behave more like a **value**.

## Design

The implementation uses hashing to locate candidate values and then performs an exact shallow equality check before reusing an existing value. Hash collisions therefore do not determine equality.

Property order is ignored for records and structs, but element order matters for tuples.

The intern cache uses weak references, so canonical values do not need to be kept alive solely because they have previously been created.

Constructed records and structs are copied before interning, so callers cannot alter an interned value by modifying the source object.

There are no runtime dependencies.

## License

ISC