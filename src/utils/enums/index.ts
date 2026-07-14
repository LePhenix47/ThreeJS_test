export default class Enum {
  /**
   * Returns all keys (names) of the enum
   */
  static keys<T extends Record<string, string | number>>(
    enumObj: T,
  ): (keyof T)[] {
    return Object.keys(enumObj).filter((key) =>
      isNaN(Number(key)),
    ) as (keyof T)[];
  }

  /**
   * Returns all values of the enum (numeric or string)
   */
  static values<T extends Record<string, string | number>>(
    enumObj: T,
  ): T[keyof T][] {
    return Enum.keys(enumObj).map((key) => enumObj[key]);
  }

  /**
   * Returns key-value pairs as [key, value][]
   */
  static entries<T extends Record<string, string | number>>(
    enumObj: T,
  ): Array<[keyof T, T[keyof T]]> {
    return Enum.keys(enumObj).map((key) => [key, enumObj[key]]);
  }

  /**
   * Checks if a key exists in the enum
   */
  static has<T extends Record<string, string | number>>(
    enumObj: T,
    key: string,
  ): boolean {
    return Enum.keys(enumObj).includes(key as keyof T);
  }

  /**
   * Checks if a value exists in the enum
   */
  static hasValue<T extends Record<string, string | number>>(
    enumObj: T,
    value: T[keyof T],
  ): boolean {
    return Enum.values(enumObj).includes(value);
  }

  /**
   * Gets the key/name for a given enum value
   */
  static getName<T extends Record<string, string | number>>(
    enumObj: T,
    value: T[keyof T],
  ): keyof T | undefined {
    const entry = Enum.entries(enumObj).find(([, v]) => v === value);
    return entry ? entry[0] : undefined;
  }
}
