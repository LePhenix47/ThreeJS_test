type EnumType = Record<string, string | number>;

export default class Enum {
  /**
   * Returns all keys (names) of the enum
   */
  static keys<T extends EnumType>(enumObj: T): (keyof T)[] {
    return Object.keys(enumObj).filter((key) =>
      isNaN(Number(key)),
    ) as (keyof T)[];
  }

  /**
   * Returns the length of the enum (how many keys it has)
   */
  static length<T extends EnumType>(enumObj: T): number {
    return Enum.keys(enumObj).length;
  }

  /**
   * Returns all values of the enum (numeric or string)
   */
  static values<T extends EnumType>(enumObj: T): T[keyof T][] {
    return Enum.keys(enumObj).map((key) => enumObj[key]);
  }

  /**
   * Returns key-value pairs as [key, value][]
   */
  static entries<T extends EnumType>(enumObj: T): Array<[keyof T, T[keyof T]]> {
    return Enum.keys(enumObj).map((key) => [key, enumObj[key]]);
  }

  /**
   * Checks if a key exists in the enum
   */
  static has<T extends EnumType>(enumObj: T, key: string): boolean {
    return Enum.keys(enumObj).includes(key as keyof T);
  }

  /**
   * Checks if a value exists in the enum
   */
  static hasValue<T extends EnumType>(enumObj: T, value: T[keyof T]): boolean {
    return Enum.values(enumObj).includes(value);
  }

  /**
   * Gets the key/name for a given enum value
   */
  static getName<T extends EnumType>(
    enumObj: T,
    value: T[keyof T],
  ): keyof T | undefined {
    const entry = Enum.entries(enumObj).find(([, v]) => v === value);
    return entry ? entry[0] : undefined;
  }
}
