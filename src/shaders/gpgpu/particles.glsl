uniform float uTime;
uniform float uDeltaTime;
uniform float uFlowFieldInfluence;

uniform sampler2D uBase;

#include ../utils/noise/simplexNoise4d

vec4 applyFlowField(vec4 particle, float time) {
    float influence = (uFlowFieldInfluence * -2.0) + 1.0; // ? [0,1] → [1, -1], order matters 

    float strength = simplexNoise4d(vec4(particle.xyz * 0.2, time + 1.0));
    strength = smoothstep(influence, 1.0, strength);

    vec3 flowField = vec3(//
    simplexNoise4d(vec4(particle.xyz + 0.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 1.0, time)), //
    simplexNoise4d(vec4(particle.xyz + 2.0, time)) // 
    );

    flowField = normalize(flowField);

    particle.xyz += flowField * uDeltaTime * 0.5 * strength;

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
        particle.xyz = base.xyz;
        // ? Avoids long frames, when a tab is inactive, the deltaTime keeps increasing to a huge value → alpha = max(1.0, huge ass deltaTime) → have same value (synced) → bad
        // ? Can use either % 1 or fract() to only get float from value

        // particle.a = mod(particle.a, 1.0); 
        particle.a = fract(particle.a);
    } else {
    // * Flow field (GO PARTICLE, GO)
        particle = applyFlowField(particle, time);

    // * Decay
        particle.a += uDeltaTime * 0.3;

    }

    gl_FragColor = particle;
}
