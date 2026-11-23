void main() {
    // ? position is already in clip space (-1..1 plane), camera matrices are skipped on purpose
    // ? so this quad always fills the screen regardless of camera position/perspective
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
