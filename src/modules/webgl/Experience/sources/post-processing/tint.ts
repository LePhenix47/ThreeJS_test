import vertexShader from "@shaders/post-processing/tint/vertex.glsl";
import fragmentShader from "@shaders/post-processing/tint/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";

import * as THREE from "three";

type TintUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
}>;

const TintPass: TypedCustomShaderPass<TintUniforms> = {
  uniforms: {
    tDiffuse: {
      value: new THREE.Texture(),
    },
  },
  vertexShader,
  fragmentShader,
};

export default TintPass;
