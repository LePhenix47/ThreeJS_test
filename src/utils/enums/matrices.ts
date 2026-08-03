/* * column-major 4×4 matrix index: element at row r, col c → r + c * 4 */
// prettier-ignore
export enum M4 {
  r0c0 = 0,  r0c1 = 4,  r0c2 = 8,  r0c3 = 12,
  r1c0 = 1,  r1c1 = 5,  r1c2 = 9,  r1c3 = 13,
  r2c0 = 2,  r2c1 = 6,  r2c2 = 10, r2c3 = 14,
  r3c0 = 3,  r3c1 = 7,  r3c2 = 11, r3c3 = 15,
}
