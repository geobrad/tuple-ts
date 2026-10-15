export default class<H, T extends object> {
  private readonly map: Map<H, Set<WeakRef<T>>> = new Map();
  private readonly cleanupRegistry = new FinalizationRegistry<[H, WeakRef<T>]>((x) =>
    this.remove(x),
  );

  constructor(
    private readonly hashFn: (value: T) => H,
    private readonly matchFn: (a: T, b: T) => boolean,
  ) {}

  private remove([hash, ref]: [H, WeakRef<T>]): void {
    const hashBucket = this.map.get(hash);
    if (!hashBucket) {
      return;
    }
    hashBucket.delete(ref);
    if (hashBucket.size === 0) {
      this.map.delete(hash);
    }
  }

  get<T_ extends T>(obj: T_): Readonly<T_> {
    const hash = this.hashFn(obj);
    let hashBucket = this.map.get(hash);
    if (hashBucket !== undefined) {
      for (const ref of hashBucket) {
        const o = ref.deref();
        if (o && this.matchFn(obj, o)) return o as T_;
      }
    } else {
      // This hash has no bucket. Create one.
      hashBucket = new Set();
      this.map.set(hash, hashBucket);
    }

    // Object is not in the cache. Add it and return it.
    Object.freeze(obj)
    const ref = new WeakRef<T>(obj);
    hashBucket.add(ref);
    this.cleanupRegistry.register(obj, [hash, ref], this);
    return obj;
  }

  get size(): number {
    return Array.from(this.map.entries(), ([_, b]) => b.size).reduce(
      (acc, x) => acc + x,
      0,
    );
  }

  reset(): void {
    this.cleanupRegistry.unregister(this);
    this.map.clear();
  }
}
