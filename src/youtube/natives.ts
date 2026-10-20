export function hookFunction<T extends object, K extends keyof T>(
  obj: T, key: K, wrap: (orig: T[K]) => T[K],
): void {
  const original = obj[key];
  if (typeof original !== 'function') throw new TypeError(`${String(key)} is not a function`);
  const wrapped = wrap(original);
  if (typeof wrapped !== 'function') throw new TypeError('Hook must return a function');
  obj[key] = new Proxy(original, {
    apply(_target, thisArg, args) { return Reflect.apply(wrapped, thisArg, args); },
  });
}
