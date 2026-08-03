/**
 * Column-major 4×4 matrix index lookup.
 *
 * Three.js stores matrices in column-major order, so the element at row r and
 * column c lives at index r + c * 4. Members are named rRcC (zero-indexed).
 * Use these instead of bare numbers when indexing into a Float32Array[16].
 *
 * @example
 * // output.x = row 0 of M dotted with [x, y, z, 1]
 * const ndcX = (m[M4.r0c0]*x + m[M4.r0c1]*y + m[M4.r0c2]*z + m[M4.r0c3]) / w;
 */
// prettier-ignore
export enum M4 {
  r0c0 = 0,  r0c1 = 4,  r0c2 = 8,  r0c3 = 12,
  r1c0 = 1,  r1c1 = 5,  r1c2 = 9,  r1c3 = 13,
  r2c0 = 2,  r2c1 = 6,  r2c2 = 10, r2c3 = 14,
  r3c0 = 3,  r3c1 = 7,  r3c2 = 11, r3c3 = 15,
}
