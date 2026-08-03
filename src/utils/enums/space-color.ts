/**
 * Axis offsets for interleaved vertex position arrays.
 *
 * Positions are packed as [x, y, z, x, y, z, ...], so adding one of these
 * to a base index i gives the component at that axis: `positions[i + SpaceEnum.X]`.
 */
export enum SpaceEnum {
  "X",
  "Y",
  "Z",
}
