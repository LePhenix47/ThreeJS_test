varying float vRelativeY;
varying vec3 vModelPosition;
varying vec3 vNormal;

uniform float uTime;
uniform vec3 uColor;

void main() {
    //  * Stripe
  float stripes = mod((vRelativeY - uTime * 0.1) * 20.0, 1.0);

  stripes = pow(stripes, 3.0);

  // * Fresnel, the reflection of the water surface based on viewing angle, perpendicular = no reflection & transparent, parallel = very reflective & opaque
  vec3 directionOfView = normalize(vModelPosition - cameraPosition);

  vec3 normal = normalize(vNormal);
  if(!gl_FrontFacing) {
    normal *= -1.0;
  }

  float fresnel = dot(directionOfView, normal) + 1.0;
  fresnel = pow(fresnel, 2.0);

  // ? Falloff to smooth out edges 
  float falloff = smoothstep(0.8, 0.0, fresnel); 

  // * Discard fragment at slice boundaries to visually separate slices
  float sliceHeight = 0.3;
  float withinSlice = fract(vRelativeY / sliceHeight);
  if (withinSlice < 0.05 || withinSlice > 0.95) discard;

  // * Slice convergence — mirrors vertex shader
  float t = mod(uTime * 0.4, 3.0) / 3.0;
  float convergence = t < 0.5
      ? smoothstep(0.0, 0.5, t)
      : smoothstep(1.0, 0.5, t);

  // * Hologram stuff
  float holographic = fresnel * stripes;
  holographic += fresnel * 1.25;
  holographic *= falloff;
  holographic *= convergence;

  // gl_FragColor = vec4(vec3(1.0), fresnel);
  // gl_FragColor = vec4(vec3(1.0), stripes);
  gl_FragColor = vec4(uColor, holographic);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}