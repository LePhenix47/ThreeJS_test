uniform float uBoundary;

bool checkBoxBoundary(float axisPosition, float axisVelocity) {
    /*
    * Origin of particle = center of box
    * |position| >= boundary → we hit boundary
    * 
    * Problem is alone it's not enough since we don't know if we hit the wall or not → gets stuck on wall 
    * So we check if it was hit with the sign() of the Velocity & Position coord
    */
    return abs(axisPosition) >= uBoundary && sign(axisPosition) == sign(axisVelocity);
}

vec4 velocityBoundFlip(vec4 velocity, vec4 position) {

    if(checkBoxBoundary(position.x, velocity.x)) {
        velocity.x *= -1.0;
    }

    if(checkBoxBoundary(position.y, velocity.y)) {
        velocity.y *= -1.0;
    }

    if(checkBoxBoundary(position.z, velocity.z)) {
        velocity.z *= -1.0;
    }

    return velocity;
}

void main() {
    // * gl_FragCoord = this pixel's coord in the offscreen compute texture, one pixel per particle
    // * resolution = that compute texture's size, injected by GPUComputationRenderer, not the canvas
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // ? GPUComputationRenderer already injected the uParticles and uVelocity uniforms
    vec4 position = texture(uParticles, uv);
    vec4 velocity = texture(uVelocity, uv);

    velocity = velocityBoundFlip(velocity, position);

    gl_FragColor = velocity;
}
