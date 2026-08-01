varying float vRelativeY;
varying vec3 vModelPosition;
varying vec3 vNormal;

uniform float uTime;

void main() {
    //  * Stripe
  float stripes = mod((vRelativeY - uTime * 0.1) * 20.0, 1.0);

  stripes = pow(stripes, 3.0);

  // * Fresnel, the reflection of the water surface based on viewing angle, perpendicular = no reflection & transparent, parallel = very reflective & opaque
  vec3 directionOfView = normalize(vModelPosition - cameraPosition);
  vec3 normal = normalize(vNormal);
  float fresnel = dot(directionOfView, normal) + 1.0;
  fresnel = pow(fresnel, 2.0);

  float holographic = fresnel * stripes;
  holographic += fresnel * 1.25;

  // gl_FragColor = vec4(vec3(1.0), fresnel);
  // gl_FragColor = vec4(vec3(1.0), stripes);
  gl_FragColor = vec4(vec3(1.0), holographic);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}