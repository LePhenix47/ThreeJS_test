float signedPow(float base, float power) {
    /*
  *  Anti-symmetric power function formula:
  *  f(x) = x * |x|ᵖ⁻¹
  *  f(x) = x * |x|ᵖ * 1/|x|
  *  f(x) = (x/|x|) * |x|ᵖ
    */
    return sign(base) * pow(abs(base), power);
}