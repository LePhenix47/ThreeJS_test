uniform float uTime;

uniform sampler2D uBase;

#include ../utils/noise/simplexNoise4d

vec4 applyFlowField(vec4 particle, float time) {
    vec3 flowField = vec3(//
    simplexNoise4d(vec4(particle.xyz + 0.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 1.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 2.0, time)) // 
    );

    flowField = normalize(flowField);

    particle.xyz += flowField * 0.01;

    return particle;
}

void main() {
    float time = uTime * 0.2;

    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles uniform
    vec4 particle = texture(uParticles, uv);

    vec4 base = texture(uBase, uv);

    // * Particle dies 😭😭😭😭😭😭
    if(particle.a >= 1.0) {

    } else {
    // * Flow field (GO PARTICLE, GO)
        particle = applyFlowField(particle, time);

    }

    // * Decay
    particle.a += 0.001;

    gl_FragColor = particle;
}
