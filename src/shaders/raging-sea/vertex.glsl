uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;

uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;

uniform float uComputedNormalShift;

uniform vec2 uCircularWaveOrigin;

uniform bool uIsCircularWave;

varying float vElevation;
varying vec3 vNormal;
varying vec3 vPosition;

varying float vFogDepth;

#include ../utils/perlin-noise/perlinClassic3D
#include ../utils/vectors/direction

float waveElevation(vec3 position) {
    float elevation = 0.0;

    if(uIsCircularWave) {
        float distanceFromCenter = distance(position.xz, uCircularWaveOrigin);
        elevation = sin(distanceFromCenter * uBigWavesFrequency.x - uTime * uBigWavesSpeed) * uBigWavesElevation;
    } else {
        elevation = sin(position.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) *
            sin(position.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) *
            uBigWavesElevation;
    }

    for(float i = 1.0; i <= uSmallIterations; i++) {
        float noise = perlinClassic3D(vec3(position.xz * uSmallWavesFrequency * i, uTime * uSmallWavesSpeed)) * uSmallWavesElevation / i;
        elevation -= abs(noise);
    }
    return elevation;
}

void main() {
    // * Base position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    vec3 modelPositionA = modelPosition.xyz + vec3(uComputedNormalShift, 0.0, 0.0);
    vec3 modelPositionB = modelPosition.xyz + vec3(0.0, 0.0, -1.0 * uComputedNormalShift);

    // * Elevation
    float elevation = waveElevation(modelPosition.xyz);

    modelPosition.y += elevation;

    modelPositionA.y += waveElevation(modelPositionA);
    modelPositionB.y += waveElevation(modelPositionB);

    // * Computed normals
    vec3 toA = direction(modelPosition.xyz, modelPositionA);
    vec3 toB = direction(modelPosition.xyz, modelPositionB);
    vec3 computedNormal = cross(toA, toB);

    // * Final position
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // * Varyings
    vElevation = elevation;

    vNormal = computedNormal;
    vPosition = modelPosition.xyz;
    vFogDepth = -1.0 * viewPosition.z;
}
