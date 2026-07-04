/**
 * Named indices for RGB color components in a `Float32Array` buffer attribute.
 *
 * @example
 * colors[i3 + ColorEnum.Red]   = mixedColor.r;
 * colors[i3 + ColorEnum.Green] = mixedColor.g;
 * colors[i3 + ColorEnum.Blue]  = mixedColor.b;
 */
export enum ColorEnum {
  "Red",
  "Green",
  "Blue",
}

/**
 * Named indices for XYZ spatial components in a `Float32Array` buffer attribute.
 *
 * @example
 * positions[i3 + SpaceEnum.X] = Math.cos(angle) * radius;
 * positions[i3 + SpaceEnum.Y] = 0.0;
 * positions[i3 + SpaceEnum.Z] = Math.sin(angle) * radius;
 */
export enum SpaceEnum {
  "X",
  "Y",
  "Z",
}
