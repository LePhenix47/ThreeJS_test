import vertexShader from "@shaders/post-processing/displacement/vertex.glsl";
import fragmentShader from "@shaders/post-processing/displacement/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";

import * as THREE from "three";

type DisplacementUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
  uTime: number;
}>;

const DisplacementPass: TypedCustomShaderPass<DisplacementUniforms> = {
  uniforms: {
    tDiffuse: {
      value: new THREE.Texture(),
    },
    uTime: new THREE.Uniform(0),
  },
  vertexShader,
  fragmentShader,
};

export default DisplacementPass;
