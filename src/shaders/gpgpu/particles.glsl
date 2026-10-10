uniform float uTime;

#include ../utils/noise/simplexNoise4d

void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the variable
    vec4 particle = texture(uParticles, uv);

    float time = uTime * 0.2;

    vec3 flowField = vec3(//
    simplexNoise4d(vec4(particle.xyz + 0.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 1.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 2.0, time)) // 
    );

    flowField = normalize(flowField);

    particle.xyz += flowField * 0.01;

    gl_FragColor = particle;
    // gl_FragColor = vec4(uv, 1.0, 1.0);
}
