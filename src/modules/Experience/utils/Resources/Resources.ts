import * as THREE from "three";
import EventEmitter from "../EventEmitter";
import {
  DRACOLoader,
  GLTF,
  GLTFLoader,
  HDRLoader,
} from "three/examples/jsm/Addons.js";
import {
  MaterialMapName,
  Source,
  TextureName,
  ResourceOptions,
  SourceArraySchema,
} from "./types";

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

  public allLoaded = false;
  private loadingManager: THREE.LoadingManager;
  private originalOnLoad: THREE.LoadingManager["onLoad"] | undefined;
  private originalOnProgress: THREE.LoadingManager["onProgress"] | undefined;
  private originalOnStart: THREE.LoadingManager["onStart"] | undefined;
  private originalOnError: THREE.LoadingManager["onError"] | undefined;

  constructor(rawSources: Source[] = [], options: ResourceOptions = {}) {
    super();

    const parsed = SourceArraySchema.safeParse(rawSources);
    if (!parsed.success) {
      throw new Error(`Invalid sources: ${parsed.error.message}`);
    }
    this.sources = parsed.data;

    const { loadingManager, dracoDecoderPath } = options;
    this.loadingManager = loadingManager ?? new THREE.LoadingManager();
    if (loadingManager) {
      this.storeOriginalCallbacks();
    }

    this.handleLoadingManager();

    this.setLoaders({
      dracoDecoderPath: dracoDecoderPath,
    });

    console.log("Resources instantiated");

    this.loadResources();
  }

  private storeOriginalCallbacks = () => {
    // * Since we overwrite the loadingManager (ex: handleLoadingManager method), we need to store the original callbacks
    this.originalOnStart = this.loadingManager.onStart;
    this.originalOnProgress = this.loadingManager.onProgress;
    this.originalOnLoad = this.loadingManager.onLoad;

    this.originalOnError = this.loadingManager.onError;
  };

  private handleLoadingManager = () => {
    this.loadingManager.onLoad = () => {
      this.allLoaded = true;
      this.emit("textures-loaded");
      console.log("Textures loaded");

      this.originalOnLoad?.();
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
    console.log(`${source.name} loaded`);
  };
}

export default Resources;
