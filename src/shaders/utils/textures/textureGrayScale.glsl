float textureGrayScale(sampler2D inputTexture, vec2 uv) {
    // ? Gray scale pics have all color channels set to same value
    vec4 textureColor = texture(inputTexture, uv);
    return textureColor.r;
}