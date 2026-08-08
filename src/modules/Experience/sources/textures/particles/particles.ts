import { Source } from "@modules/Experience/utils/Resources/types";
import tex1 from "@public/textures/particles/1.png";
import tex2 from "@public/textures/particles/2.png";
import tex3 from "@public/textures/particles/3.png";
import tex4 from "@public/textures/particles/4.png";
import tex5 from "@public/textures/particles/5.png";
import tex6 from "@public/textures/particles/6.png";
import tex7 from "@public/textures/particles/7.png";
import tex8 from "@public/textures/particles/8.png";

const particles = {
  name: "particles",
  type: "textureArray",
  paths: [tex1, tex2, tex3, tex4, tex5, tex6, tex7, tex8],
} as const satisfies Source;

export default particles;
