import vertexShader from "@shaders/post-processing/tint/vertex.glsl";
import fragmentShader from "@shaders/post-processing/tint/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";

import * as THREE from "three";

type TintUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
  uTint: THREE.Vector3;
}>;

const TintPass: TypedCustomShaderPass<TintUniforms> = {
  uniforms: {
    tDiffuse: {
      value: new THREE.Texture(),
    },
    uTint: {
      value: new THREE.Vector3(-0.1, 0, 0),
    },
  },
  vertexShader,
  fragmentShader,
};

export default TintPass;
