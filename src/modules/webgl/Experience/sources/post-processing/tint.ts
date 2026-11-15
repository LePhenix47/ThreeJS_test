import vertexShader from "@shaders/post-processing/tint/vertex.glsl";
import fragmentShader from "@shaders/post-processing/tint/fragment.glsl";
import {
  MapAsUniforms,
  TypedShaderMaterial,
} from "@modules/webgl/World/types/uniforms";

type TintUniforms = MapAsUniforms<{}>;

const TintPass = {
  uniforms: {},
  vertexShader,
  fragmentShader,
} satisfies Pick<
  TypedShaderMaterial<TintUniforms>,
  "vertexShader" | "fragmentShader" | "uniforms"
>;

export default TintPass;
