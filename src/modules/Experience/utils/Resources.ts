import * as THREE from "three";
import EventEmitter from "./EventEmitter";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

type TextureSource = {
  name: string;
  type: "texture";
  path: Record<string, string>;
};

type EnvMapType = "cubeTexture" | "ldrTexture" | "hdrTexture";

type CubeTextureSource = {
  name: string;
  type: EnvMapType;
  paths: {
    px: string;
    nx: string;
    py: string;
    ny: string;
    pz: string;
    nz: string;
  };
};

export type Source = TextureSource | CubeTextureSource;

class Resources extends EventEmitter {
  public sources: Source[];
  public items: { [key: string]: THREE.Texture | THREE.CubeTexture } = {};

  public loaders: {
    [key: string]: THREE.TextureLoader | THREE.CubeTextureLoader | GLTFLoader;
  } = {};

  get toLoadCount(): number {
    return this.sources.length - this.loadedCount;
  }
  get loadedCount() {
    return Object.keys(this.items).length;
  }

  get hasLoadedAllResources() {
    return this.toLoadCount === 0;
  }

  constructor(rawSources: Source[] = []) {
    super();

    this.sources = rawSources;
    this.setLoaders();
  }

  private setLoaders = (opt?: { dracoDecoderPath: string }): void => {
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    this.loaders = {
      cubeTexture: cubeTextureLoader,
      texture: textureLoader,
      gltf: gltfLoader,
    };

    // if (opt.dracoDecoderPath) {
    //   gltfLoader.setDRACOLoader(new DRACOLoader("/draco_decoder.js"));
    // }
  };

  public loadResources = () => {};
}

export default Resources;
