float getLuminance(vec3 color) {
    // ? Rec. 709 weights. They sum to 1.0, so a gray pixel (r = g = b) keeps its value and a colored one becomes its gray equivalent
    vec3 colorLuminance = vec3(0.2126, 0.7152, 0.0722);
    return dot(color, colorLuminance);
}
