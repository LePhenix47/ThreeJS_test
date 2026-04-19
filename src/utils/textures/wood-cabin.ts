import floorColorTexture from "@public/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_diff_1k.jpg";
import floorNormalTexture from "@public/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_nor_gl_1k.png";

/*
 * ARM = Ambient Occlusion + Roughness + Metalness
 * Reminder:
 *  - Ambient Occlusion: How much ambient light a surface can "receive" based on its geometry, Tight corners, creases, and gaps are harder for light to reach so they appear darker, even without a direct shadow caster
 *  - Roughness: How microscopically bumpy the surface is, 0 is smooth as a pool ball, 1 is rough as a rock
 *  - Metalness: Whether the surface behaves like a metal or a dielectric (non-metal). Metals reflect their color into reflections, non-metals don't. It's more about the nature of the reflection than the sharpness of it
 */
import floorARMTexture from "@public/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_arm_1k.jpg";

export { floorColorTexture, floorNormalTexture, floorARMTexture };
