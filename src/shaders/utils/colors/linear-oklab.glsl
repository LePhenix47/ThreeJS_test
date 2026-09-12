// * Björn Ottosson's linear sRGB <-> OKLab matrices (https://bottosson.github.io/posts/oklab/)
// * Three's uniforms already carry linear values (ColorManagement converts sRGB on `.set()`),
// * so this skips the sRGB<->linear step entirely and only does linear<->OKLab.

vec3 linearToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  // ? cbrt via sign(x) * pow(abs(x), 1/3) — pow() with a negative base is undefined in GLSL,
  // ? and l/m/s can dip slightly negative for out-of-gamut colors
  vec3 lms = vec3(l, m, s);
  vec3 lmsCubeRoot = sign(lms) * pow(abs(lms), vec3(1.0 / 3.0));

  return vec3(
    0.2104542553 * lmsCubeRoot.x + 0.7936177850 * lmsCubeRoot.y - 0.0040720468 * lmsCubeRoot.z,
    1.9779984951 * lmsCubeRoot.x - 2.4285922050 * lmsCubeRoot.y + 0.4505937099 * lmsCubeRoot.z,
    0.0259040371 * lmsCubeRoot.x + 0.7827717662 * lmsCubeRoot.y - 0.8086757660 * lmsCubeRoot.z
  );
}

vec3 oklabToLinear(vec3 c) {
  float lCubeRoot = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float mCubeRoot = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float sCubeRoot = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

  float l = lCubeRoot * lCubeRoot * lCubeRoot;
  float m = mCubeRoot * mCubeRoot * mCubeRoot;
  float s = sCubeRoot * sCubeRoot * sCubeRoot;

  return vec3(
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}
