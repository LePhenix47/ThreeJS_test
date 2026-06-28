uniform float uTime;
uniform float uSize;

attribute float aScales;
attribute vec3 aRandomness;

varying float vScales;
varying vec3 vColor;

void main() {
    /*
    * Position
    */ 
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

// * Galaxy "vortex" effect
    float distanceFromCenter = distance(modelPosition.xz, vec2(0.0));
    float angle = atan(modelPosition.x, modelPosition.z);
    float angleOffset = (1.0 / distanceFromCenter) * uTime * 0.2;

    angle += angleOffset;

    modelPosition.x = distanceFromCenter * cos(angle);
    modelPosition.z = distanceFromCenter * sin(angle);

// * Add randomness on the position
    modelPosition += vec4(aRandomness, 0.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    /*
    * Size, sets the size of the fragment
    */
    gl_PointSize = uSize * aScales;
    // * Adds perspective to our stars, so the ones closer to camera look bigger than those farther
    // * See node_modules/three/src/renderers/shaders/ShaderLib/points.glsl.js 
    //* Explanation on video: www.youtube.com/watch?v=qjWkNZ0SXfo One formula that demystifies 3D graphics by Tsoding
    gl_PointSize *= (1.0 / -viewPosition.z);

    // * Attribute → Varyings
    vScales = aScales;

    vColor = color;
}