# tuple-ts

**Immutable tuples and structs with value-based identity for JavaScript and TypeScript.**

JavaScript normally compares arrays and objects by reference:

```ts
[1, 2] === [1, 2] // false

{ x: 1 } === { x: 1 } // false
```

`tuple-ts` gives you a different model:

```ts
tuple(1, 2) === tuple(1, 2) // true

record({ x: 1 }) === record({ x: 1 }) // true
```

Equal values are **interned to the same object**.

That makes tuples and structs immutable, naturally usable as composite `Map` keys and `Set` values, and particularly pleasant to use in functional TypeScript.

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

You can create a reusable constructor for a particular tuple type:

```ts
type Point = [x: number, y: number];

const Point = tuple<Point>;

const a = Point(10, 20);
const b = Point(10, 20);

a === b; // true
```

The result retains the tuple's TypeScript type while gaining the same runtime identity semantics.

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

### Typed records

As with tuples, you can define a reusable typed constructor by passing a type argument:

```ts
interface User {
  id: string;
  name: string;
  updatedAt: number;
}

const User = record<User>;

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

## Structs

`record` interns whatever shape you hand it — which means any difference in keys or values produces a different object. If you want something more locked-down, where a fixed declared set of keys defines identity, use `struct`.

`struct` takes key names as arguments and returns a factory. The factory accepts any object that has at least those keys, extracts exactly those keys, and interns the result.

```ts
import { struct } from "tuple-ts";

const Point = struct("x", "y");

const a = Point({ x: 1, y: 2 });
const b = Point({ x: 1, y: 2 });

a === b; // true
```

Because the schema is fixed at construction time, equality is always based on precisely those keys — no more, no less:

```ts
const a = Point({ x: 1, y: 2 });
const b = Point({ x: 1, y: 3 });

a === b; // false — y differs
```

All keys passed to `struct` must be distinct strings. Passing duplicate keys throws a `DuplicateKeyError`.

## Equality semantics

Primitive values are compared using [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is):

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

Nested tuples and structs work particularly well because they are themselves canonical values.

## Immutable by design

Tuples and structs returned by `tuple-ts` are frozen:

```ts
const point = tuple(10, 20);

Object.isFrozen(point); // true
```

This is important to the identity semantics: once a value has been interned, its contents cannot subsequently change while it is being used as a `Map` key or `Set` member.

## Garbage-collection friendly

Interning values creates a natural question: *doesn't the cache grow forever?*

`tuple-ts` uses `WeakRef` and `FinalizationRegistry` internally. Cached values are weakly referenced, allowing the JavaScript garbage collector to reclaim values that are no longer referenced by the application.

In other words, you don't have to manually maintain a global cache of every tuple you've ever created.

## TypeScript first

`tuple`, `record`, and `struct` are designed to preserve TypeScript's inference:

```ts
const value = tuple(
  "hello",
  42,
  true,
);

// readonly ["hello", 42, true]
```

The library is deliberately small: the runtime API consists of three constructors:

```ts
import { tuple, record, struct } from "tuple-ts";
```

## When should I use it?

`tuple-ts` is particularly useful when you want **small immutable values with stable identity**:

* composite `Map` keys
* `Set` membership
* memoization keys
* graph/search states
* coordinates and other multi-dimensional values
* functional programming
* immutable application state
* canonical representations of frequently repeated values

If you just need an ordinary mutable array or object, use one. `tuple-ts` is for when you want the thing to behave more like a **value**.

## Design

The implementation uses hashing to locate candidate values and then performs an exact shallow equality check before reusing an existing value. Hash collisions therefore do not determine equality.

The intern cache uses weak references, so canonical values do not need to be kept alive solely because they have previously been created.

There are no runtime dependencies.

## License

ISC
