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

type TextureSource = {
  name: string;
  type: "texture" | "ldrEnvTexture";
  paths: Record<string, string>;
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
  onProgress: (loaded: number, total: number) => void;
  onLoad: () => void;
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

  get toLoadCount(): number {
    return this.sources.length - this.loadedCount;
  }
  get loadedCount() {
    return Object.keys(this.items).length;
  }

  get hasLoadedAllResources() {
    return this.toLoadCount === 0;
  }

  constructor(rawSources: Source[] = [], options?: ResourceOptions) {
    super();

    this.sources = rawSources;
    this.setLoaders({
      dracoDecoderPath: options?.dracoDecoderPath,
    });
  }

  private setLoaders = (
    opt?: Pick<ResourceOptions, "dracoDecoderPath">,
  ): void => {
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();

    const hdrLoader = new HDRLoader();

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
            this.loaders.texture.load(
              path,
              (textureLoaded: THREE.Texture<HTMLImageElement>) => {
                this.items[source.name] = textureLoaded;
              },
            );
          }
          break;
        }

        case "gltf": {
          this.loaders.gltf.load(source.path, (gltfLoaded: GLTF) => {
            this.items[source.name] = gltfLoaded;
          });
          break;
        }

        case "cubeEnvTexture": {
          const { px, nx, py, ny, pz, nz } = source.paths;
          this.loaders.cubeTexture.load(
            [px, nx, py, ny, pz, nz],
            (textureLoaded: THREE.CubeTexture) => {
              this.items[source.name] = textureLoaded;
            },
          );
          break;
        }

        case "hdrEnvTexture": {
          this.loaders.hdr.load(
            source.path,
            (dataTextureLoaded: THREE.DataTexture) => {
              this.items[source.name] = dataTextureLoaded;
            },
          );
          break;
        }

        default: {
          const type = source["type"]; // ? source.type is set to never by typescript, accessing via index instead
          throw new Error(`Invalid resource type ${type}`);
        }
      }
    }
  };

  private sourceLoaded = (source: Source, file: any) => {
    this.items[source.name] = file;

    if (this.hasLoadedAllResources) {
      console.log("All resources have been loaded !!!");

      this.emit("loaded");
    }
  };
}

export default Resources;
