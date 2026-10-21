import { struct } from ".";
import * as TT from "./type-testing";

type ExpectNever<T extends never> = true;
type ExpectExtends<Outer, Inner extends Outer> = true;

describe("struct", () => {
  it("narrows on construction", () => {
    const User = struct(["name", "age"]);
    const user0 = User("Bob", 25);
    const user1 = User("Bob", 25);
    TT.expect<TT.Assignable<typeof user1, readonly ["Bob", 25]>>;
    TT.expect<TT.Assignable<typeof user1, { readonly name: "Bob"; age: 25 }>>;
    expect(user0).toBe(user1);
    expect(Array.isArray(user0)).toBe(true);
    expect([...user1]).toEqual(["Bob", 25]);
    expect(user1.length).toBe(2);
    expect(user1.name).toBe("Bob");
    expect(user1.age).toBe(25);
    expect(Object.isFrozen(user1)).toBe(true);
    expect({ ...user1 }).toEqual({ 0: "Bob", 1: 25, name: "Bob", age: 25 });
  });

  it("has shallow identity/equality semantics", () => {
    const User = struct(["name", "age"]);
    const user1 = User("Bob", 25);
    const user2 = User("Bob", 25);
    const user3 = User("Henry", 25);
    expect(user2).toBe(user1);
    expect(user2 === user1).toBe(true);
    expect(user3).not.toBe(user1);
    TT.expect<TT.Equivalent<Extract<typeof user3, typeof user2>, never>>;
  });

  it("supports object-based construction", () => {
    const User = struct(["name", "age"]);
    const user1 = User.from({ name: "Bob", age: 25 });
    TT.expect<TT.Assignable<typeof user1, readonly ["Bob", 25]>>;
    TT.expect<TT.Assignable<typeof user1, { name: "Bob"; age: 25 }>>;
    expect(user1).toBe(User("Bob", 25));
    const user2 = User.from({ name: "Henry", age: 25 });
    expect(user2).not.toBe(user1);
  });

  it("can be narrowed", () => {
    type Person = [string, number];
    const Person = struct(["name", "age"]).typed<Person>();
    TT.expect<TT.Equivalent<Parameters<typeof Person>, [string, number]>>;
    TT.expect<
      TT.Equivalent<
        Parameters<typeof Person.from>[0],
        { name: string; age: number }
      >
    >;
  });

  it("can be narrowed using an exemplar", () => {
    const Person = struct(["name", "age"]).typed("", 0);
    TT.expect<TT.Equivalent<Parameters<typeof Person>, [string, number]>>;
    TT.expect<
      TT.Equivalent<
        Parameters<typeof Person.from>[0],
        { name: string; age: number }
      >
    >;
  });

  it("can be narrowed by object type", () => {
    type Person = { name: string; age: number };
    const Person = struct(["name", "age"]).typedFrom<Person>();
    TT.expect<TT.Equivalent<Parameters<typeof Person>, [string, number]>>;
    TT.expect<
      TT.Equivalent<
        Parameters<typeof Person.from>[0],
        { name: string; age: number }
      >
    >;
  });

  it("can be narrowed by object type using an exemplar", () => {
    const Person = struct(["name", "age"]).typedFrom({ name: "", age: 0 });
    TT.expect<TT.Equivalent<Parameters<typeof Person>, [string, number]>>;
    TT.expect<
      TT.Equivalent<
        Parameters<typeof Person.from>[0],
        { name: string; age: number }
      >
    >;
  });
});
