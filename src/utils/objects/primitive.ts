import { Primitive } from "@utils/types/helper.type";

/** Runtime check matching the {@link Primitive} type — true for string, number, or boolean. */
export function isPrimitive(value: unknown): value is Primitive {
  return ["string", "number", "boolean"].includes(typeof value);
}
