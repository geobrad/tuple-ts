import { struct } from ".";

type ExpectNever<T extends never> = true;
type ExpectExtends<Outer, Inner extends Outer> = true;

describe("struct", () => {
  it("narrows on construction", () => {
    const User = struct(["name", "age"]);
    const user0 = User("Bob", 25);
    const user1 = User("Bob", 25);
    type ExpectNarrowedTuple = ExpectExtends<readonly ["Bob", 25], typeof user1>;
    type ExpectNarrowedObject = ExpectExtends<
      { name: "Bob"; age: 25 },
      typeof user1
    >;
    type ExpectNotNeverA = ExpectExtends<typeof user1[0], "Bob">;
    type ExpectNotNeverB = ExpectExtends<typeof user1.name, "Bob">;
    type ExpectNotNeverD = ExpectExtends<typeof user1[1], 25>;
    type ExpectNotNeverC = ExpectExtends<typeof user1.age, 25>;
    expect(user0).toBe(user1);
    expect([...user1]).toEqual(["Bob", 25]);
    expect(user1.length).toBe(2);
    expect(user1.name).toBe("Bob");
    expect(user1.age).toBe(25);
    expect(Object.isFrozen(user1)).toBe(true);
    expect({...user1}).toEqual({0: "Bob", 1: 25, name: "Bob", age: 25});
  });

  it("has shallow identity/equality semantics", () => {
    const User = struct(["name", "age"]);
    const user1 = User("Bob", 25);
    const user2 = User("Bob", 25);
    const user3 = User("Henry", 25);
    expect(user2).toBe(user1);
    expect(user2 === user1).toBe(true);
    expect(user3).not.toBe(user1);
    type ExpectNoOverlap = ExpectNever<Extract<typeof user3, typeof user2>>;
  });

  it("supports object-based construction", () => {
    const User = struct(["name", "age"]);
    const user1 = User.from({name: "Bob", age: 25});
    type ExpectNarrowedTuple = ExpectExtends<readonly ["Bob", 25], typeof user1>;
    type ExpectNarrowedObject = ExpectExtends<
      { name: "Bob"; age: 25 },
      typeof user1
    >;
    type ExpectNotNeverA = ExpectExtends<typeof user1[0], "Bob">;
    type ExpectNotNeverB = ExpectExtends<typeof user1.name, "Bob">;
    type ExpectNotNeverD = ExpectExtends<typeof user1[1], 25>;
    type ExpectNotNeverC = ExpectExtends<typeof user1.age, 25>;
    expect(user1).toBe(User("Bob", 25));

    const user2 = User.from({name: "Henry", age: 25});
    type ExpectNoOverlap = ExpectNever<Extract<typeof user2, typeof user1>>;
    expect(user2).not.toBe(user1);
  });

  it("can be narrowed", () => {
    type Person = [string, number];
    const Person = struct(["name", "age"]).narrow<Person>();
    type Test1 = ExpectExtends<[string, number], Parameters<typeof Person>>;
    type Test2 = ExpectExtends<Parameters<typeof Person>, [string, number]>;
  });


  it("can be narrowed by object type", () => {
    type Person = {name: string, age: number};
    const Person = struct(["name", "age"]).narrowFrom<Person>();
    type Test1 = ExpectExtends<[string, number], Parameters<typeof Person>>;
    type Test2 = ExpectExtends<Parameters<typeof Person>, [string, number]>;
  });
});
