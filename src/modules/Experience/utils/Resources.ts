import * as THREE from "three";
import EventEmitter from "./EventEmitter";
import {
  DRACOLoader,
  GLTF,
  GLTFLoader,
  HDRLoader,
} from "three/examples/jsm/Addons.js";

type CubeFaces = {
  px: string;
  nx: string;
  py: string;
  ny: string;
  pz: string;
  nz: string;
};

type TexturePaths = {
  color: string;
  normal: string;
  roughness: string;
  ao: string;
  height: string;
  metalness: string;
  alpha: string;
  emissive: string;

  // physical material extras
  clearcoat: string;
  clearcoatNormal: string;
  clearcoatRoughness: string;

  transmission: string;
  thickness: string;

  sheenColor: string;
  sheenRoughness: string;

  iridescence: string;
  iridescenceThickness: string;
};

type TextureName = keyof TexturePaths;
type MaterialMapName = {
  [K in keyof THREE.MaterialJSON]: K extends `${string}Map` | "map" ? K : never;
}[keyof THREE.MaterialJSON];

export const texturePropertyObject = {
  color: "map",
  normal: "normalMap",
  roughness: "roughnessMap",
  ao: "aoMap",
  height: "displacementMap",
  metalness: "metalnessMap",
  alpha: "alphaMap",
  emissive: "emissiveMap",
} as const satisfies Partial<Record<TextureName, MaterialMapName>>;

type TextureSource = {
  name: string;
  type: "texture" | "ldrEnvTexture";
  paths: Partial<TexturePaths>;
};

type CubeTextureSource = {
  name: string;
  type: "cubeEnvTexture";
  paths: CubeFaces;
};

type GltfSource = {
  name: string;
  type: "gltf";
  path: string;
};

type HdrSource = {
  name: string;
  type: "hdrEnvTexture";
  path: string;
};

export type Source = TextureSource | CubeTextureSource | GltfSource | HdrSource;

type ResourceOptions = Partial<{
  dracoDecoderPath: string;
  loadingManager: THREE.LoadingManager;
}>;

class Resources extends EventEmitter {
  public sources: Source[];
  public items: {
    [key: string]: THREE.Texture | THREE.CubeTexture | GLTF | THREE.DataTexture;
  } = {};

  public loaders: {
    cubeTexture: THREE.CubeTextureLoader;
    texture: THREE.TextureLoader;
    gltf: GLTFLoader;
    draco: DRACOLoader;
    hdr: HDRLoader;
  };

  private allLoaded = false;
  private loadingManager: THREE.LoadingManager;

  get hasLoadedAllResources() {
    return this.allLoaded;
  }

  constructor(rawSources: Source[] = [], options?: ResourceOptions) {
    super();

    this.sources = rawSources;
    this.loadingManager = options?.loadingManager ?? new THREE.LoadingManager();
    this.handleLoadingManager();

    this.setLoaders({
      dracoDecoderPath: options?.dracoDecoderPath,
    });
  }

  private handleLoadingManager = () => {
    this.loadingManager.onLoad = () => {
      this.allLoaded = true;
      this.emit("textures-loaded");
    };
  };

  private setLoaders = (
    opt?: Pick<ResourceOptions, "dracoDecoderPath">,
  ): void => {
    const loadingManager = this.loadingManager;

    const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager);
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const gltfLoader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader(loadingManager);

    const hdrLoader = new HDRLoader(loadingManager);

    if (opt?.dracoDecoderPath) {
      dracoLoader.setDecoderPath(opt.dracoDecoderPath);
      gltfLoader.setDRACOLoader(dracoLoader);
    }

    const loaders = {
      cubeTexture: cubeTextureLoader,
      texture: textureLoader,
      gltf: gltfLoader,
      draco: dracoLoader,
      hdr: hdrLoader,
    } as const;

    this.loaders = loaders;
  };

  public loadResources = () => {
    for (const source of this.sources) {
      switch (source.type) {
        case "texture":
        case "ldrEnvTexture": {
          for (const [key, path] of Object.entries(source.paths)) {
            this.loaders.texture.load(path, (textureLoaded) => {
              this.sourceLoaded(source, textureLoaded);
            });
          }
          break;
        }

        case "gltf": {
          this.loaders.gltf.load(source.path, (gltfLoaded) => {
            this.sourceLoaded(source, gltfLoaded);
          });
          break;
        }

        case "cubeEnvTexture": {
          const { px, nx, py, ny, pz, nz } = source.paths;
          this.loaders.cubeTexture.load(
            [px, nx, py, ny, pz, nz],
            (textureLoaded) => {
              this.sourceLoaded(source, textureLoaded);
            },
          );
          break;
        }

        case "hdrEnvTexture": {
          this.loaders.hdr.load(source.path, (dataTextureLoaded) => {
            this.sourceLoaded(source, dataTextureLoaded);
          });
          break;
        }

        default: {
          const type = source["type"]; // ? source.type is set to never by typescript, accessing via index instead
          throw new Error(`Invalid resource type ${type}`);
        }
      }
    }
  };

  private sourceLoaded = (
    source: Source,
    file: THREE.Texture<unknown> | GLTF | THREE.CubeTexture | THREE.DataTexture,
  ) => {
    this.items[source.name] = file;
  };
}

export default Resources;
