float valueFromNewRange(float value, float oldMin, float oldMax, float newMin, float newMax) {
    float slope = (newMax - newMin) / (oldMax - oldMin);

    return newMin + (value - oldMin) * slope;
}