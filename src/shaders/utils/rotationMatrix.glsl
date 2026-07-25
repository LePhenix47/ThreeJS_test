vec2 rotationMatrix(vec2 coords, float angleDeg, vec2 origin) {
    float angleRad = radians(angleDeg);

    float cosAngle = cos(angleRad);
    float sinAngle = sin(angleRad);

    /* Column-major: mat2(col0.x, col0.y, col1.x, col1.y)
     *  | cos  -sin |
     *  | sin   cos |
     */
    mat2 rotMat = mat2(cosAngle, sinAngle, -sinAngle, cosAngle);

    return rotMat * (coords - origin) + origin;
}