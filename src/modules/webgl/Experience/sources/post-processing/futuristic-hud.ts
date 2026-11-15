import vertexShader from "@shaders/post-processing/futuristic-hud/vertex.glsl";
import fragmentShader from "@shaders/post-processing/futuristic-hud/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";

import * as THREE from "three";

type FuturisticHudUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
  uNormalMap: THREE.Texture;
}>;

const futuristicHudShader: TypedCustomShaderPass<FuturisticHudUniforms> = {
  uniforms: {
    tDiffuse: {
      value: new THREE.Texture(),
    },
    uNormalMap: {
      value: new THREE.Texture(),
    },
  },
  vertexShader,
  fragmentShader,
};

export default futuristicHudShader;
