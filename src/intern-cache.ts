type Value = symbol | object;

export default class<H, K, V extends Value> {
  private readonly map: Map<H, Set<WeakRef<V>>> = new Map();
  private readonly cleanupRegistry = new FinalizationRegistry<[H, WeakRef<V>]>(
    (x) => this.remove(x),
  );

  constructor(
    private readonly hashFn: (key: K) => H,
    private readonly matchFn: (key: K, value: V) => boolean,
    private readonly injestFn: (key: K) => V,
  ) {}

  private remove([hash, valueRef]: [H, WeakRef<V>]): void {
    const hashBucket = this.map.get(hash);
    if (!hashBucket) {
      return;
    }
    hashBucket.delete(valueRef);
    if (hashBucket.size === 0) {
      this.map.delete(hash);
    }
  }

  getOrSet<K_ extends K, V_ extends V>(key: K_): V_ {
    const hash = this.hashFn(key);
    let hashBucket = this.map.get(hash);
    if (hashBucket !== undefined) {
      for (const ref of hashBucket) {
        const o = ref.deref();
        if (o && this.matchFn(key, o)) return o as V_;
      }
    } else {
      // This hash has no bucket. Create one.
      hashBucket = new Set();
      this.map.set(hash, hashBucket);
    }

    // Object is not in the cache. Add it and return it.
    const value = this.injestFn(key) as V_;
    const valueRef = new WeakRef(value);
    hashBucket.add(valueRef);
    this.cleanupRegistry.register(value, [hash, valueRef], this);
    return value;
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
