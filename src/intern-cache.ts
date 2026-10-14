export default class<H, T extends object> {
  private readonly map: Map<H, Set<WeakRef<T>>> = new Map();
  private cleanupRegistry = new FinalizationRegistry<[H, WeakRef<T>]>((x) =>
    this.remove(x),
  );

  constructor(
    private readonly hashFn: (value: T) => H,
    private readonly matchFn: (key: T, target: T) => boolean,
    private readonly injestFn: <T_ extends T>(value: T_) => T_,
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

  get<T_ extends T>(key: T_): T_ {
    const hash = this.hashFn(key);
    let hashBucket = this.map.get(hash);
    if (hashBucket !== undefined) {
      for (const ref of hashBucket) {
        const o = ref.deref();
        if (o && this.matchFn(key, o)) return o as T_;
      }
    } else {
      // This hash has no bucket. Create one.
      hashBucket = new Set();
      this.map.set(hash, hashBucket);
    }

    // Object is not in the cache. Add it and return it.
    const obj = this.injestFn(key)
    const ref = new WeakRef<T>(obj);
    hashBucket.add(ref);
    this.cleanupRegistry.register(obj, [hash, ref]);
    return obj;
  }

  get size(): number {
    return Array.from(this.map.entries(), ([_, b]) => b.size).reduce(
      (acc, x) => acc + x,
      0,
    );
  }

  reset(): void {
    this.map.clear();
    this.cleanupRegistry = new FinalizationRegistry((x) => this.remove(x));
  }
}
