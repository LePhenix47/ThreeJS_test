uniform float uTime;
uniform float uSize;

attribute float aScales;

varying float vScales;

void main() {
    /*
    * Position
    */ 
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    /*
    * Size, sets the size of the fragment
    */
    gl_PointSize = uSize * aScales;
    // * Adds perspective to our stars, so the ones closer to camera look bigger than those farther
    // * See node_modules/three/src/renderers/shaders/ShaderLib/points.glsl.js 
    gl_PointSize *= (1.0 / -viewPosition.z);

    // * Attribute → Varyings
    vScales = aScales;
}