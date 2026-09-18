import * as THREE from "three";
import type { TextureName } from "@/modules/Experience/utils/Resources/types";
import { GLTF } from "three/examples/jsm/Addons.js";

/** Full map of all possible texture slots to their loaded THREE.Texture instances. */
export type EntityTexture = Record<TextureName, THREE.Texture>;
