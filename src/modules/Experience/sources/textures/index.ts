import floorTextures from "./floor/floor";
import envMapTexture from "./environment-maps/map";

const textures = [floorTextures, envMapTexture] as const;

export type TextureNames = (typeof textures)[number]["name"];

export default textures;
