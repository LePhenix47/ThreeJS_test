import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { ShaderTexturedMeshEntity } from "./types/mesh-entity";
import { GetPathsFromName } from "@modules/Experience/sources/textures";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/earth/vertex.glsl";
import fragmentShader from "@shaders/earth/fragment.glsl";

import atmosphereVertexShader from "@shaders/atmosphere/vertex.glsl";
import atmosphereFragmentShader from "@shaders/atmosphere/fragment.glsl";

type EarthState = {
  wireframe: boolean;
  uAtmosphereDayColor: string;
  uAtmosphereTwilightColor: string;
  uCloudsParallaxShift: number;
};

type EarthUniforms = MapAsUniforms<{
  uTime: number;
  uDayTexture: THREE.Texture;
  uNightTexture: THREE.Texture;
  uSpecularCloudsTexture: THREE.Texture;
  uSpecularTexture: THREE.Texture;
  uCloudsTexture: THREE.Texture;
  uSunDirection: THREE.Vector3;
  uAtmosphereDayColor: THREE.Color;
  uAtmosphereTwilightColor: THREE.Color;
  uCloudsParallaxShift: EarthState["uCloudsParallaxShift"];
}>;

type AtmosphereUniforms = Pick<
  EarthUniforms,
  "uAtmosphereDayColor" | "uAtmosphereTwilightColor" | "uSunDirection"
>;

type EarthTextureKeys = GetPathsFromName<"earth">;
class Earth
  extends ShaderTexturedMeshEntity<EarthTextureKeys>
  implements Updatable, Destroyable
{
  public static readonly CONFIG = {
    geometry: {
      radius: 2,
      segments: 2 ** 6,
    },

    atmosphere: {
      relativeScale: 1.04,
    },
  } as const;

  private readonly experience: Experience | null;
  /** Shared with `Sun`, which mutates it in place; used directly as the `uSunDirection` uniform value. */
  private readonly sunDirection: THREE.Vector3;

  protected textures: Record<EarthTextureKeys, THREE.Texture>;
  protected geometry: THREE.SphereGeometry;
  protected material: TypedShaderMaterial<EarthUniforms>;
  protected mesh: THREE.Mesh;

  private atmosphereMaterial: TypedShaderMaterial<AtmosphereUniforms>;
  private atmosphereMesh: THREE.Mesh;

  private readonly debugDefaults: EarthState = {
    wireframe: false,
    uAtmosphereDayColor: "#00aaff",
    uAtmosphereTwilightColor: "#ff6600",
    uCloudsParallaxShift: 0,
  };
  private guiRegistry: GUIStateRegistry<EarthState> | null = null;

  private get debug() {
    return this.experience!.debug;
  }

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor(sunDirection: THREE.Vector3) {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;
    this.sunDirection = sunDirection;

    this.setTextures();
    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    this.setAtmosphere();
    this.scene.add(this.atmosphereMesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Earth");
  }

  setAtmosphere(): void {
    const { uAtmosphereDayColor, uAtmosphereTwilightColor } =
      this.debugDefaults;

    const uniforms: AtmosphereUniforms = {
      uAtmosphereDayColor: {
        value: new THREE.Color(uAtmosphereDayColor),
      },
      uAtmosphereTwilightColor: {
        value: new THREE.Color(uAtmosphereTwilightColor),
      },
      uSunDirection: new THREE.Uniform(this.sunDirection),
    };

    this.atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
    }) as TypedShaderMaterial<AtmosphereUniforms>;

    this.atmosphereMesh = new THREE.Mesh(
      this.geometry, // ? Shared with the Earth
      this.atmosphereMaterial,
    );

    const { relativeScale } = Earth.CONFIG.atmosphere;
    this.atmosphereMesh.scale.setScalar(relativeScale);
  }

  protected setTextures(): void {
    const earthTextures = this.resources.getShaderTextures("earth");

    for (const [name, texture] of Object.entries(earthTextures)) {
      if (["day", "night"].includes(name))
        texture.colorSpace = THREE.SRGBColorSpace;

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      texture.anisotropy = 8; // ? makes texture less blurry, sharper
    }

    this.textures = earthTextures;
  }

  protected setGeometry(): void {
    const { radius, segments } = Earth.CONFIG.geometry;
    this.geometry = new THREE.SphereGeometry(radius, segments, segments);
  }

  protected setMaterial(): void {
    const {
      wireframe,
      uAtmosphereDayColor,
      uAtmosphereTwilightColor,
      uCloudsParallaxShift,
    } = this.debugDefaults;

    const { day, night, specularClouds, clouds, specular } = this.textures;
    const uniforms: EarthUniforms = {
      uTime: new THREE.Uniform(0),
      uAtmosphereDayColor: {
        value: new THREE.Color(uAtmosphereDayColor),
      },
      uAtmosphereTwilightColor: {
        value: new THREE.Color(uAtmosphereTwilightColor),
      },
      uSunDirection: new THREE.Uniform(this.sunDirection),
      uDayTexture: new THREE.Uniform(day),
      uNightTexture: new THREE.Uniform(night),
      uSpecularCloudsTexture: new THREE.Uniform(specularClouds),
      uCloudsTexture: new THREE.Uniform(clouds),
      uSpecularTexture: new THREE.Uniform(specular),
      uCloudsParallaxShift: new THREE.Uniform(uCloudsParallaxShift),
    };

    this.material = new THREE.ShaderMaterial({
      wireframe,
      uniforms,
      transparent: true,
      depthWrite: true,
      vertexShader,
      fragmentShader,
    }) as TypedShaderMaterial<EarthUniforms>;
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<EarthState>(
      "earth-gui-state",
      this.debugDefaults,
    );

    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const debugFolder = gui.addFolder("Earth");

    debugFolder.add(state, "wireframe").name("Wireframe");
    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    const cloudsFolder = debugFolder.addFolder("Clouds");

    cloudsFolder
      .add(state, "uCloudsParallaxShift")
      .name("Parallax shift")
      .min(0)
      .max(1)
      .step(0.001);
    registry.bind("uCloudsParallaxShift", (v) => {
      this.material.uniforms.uCloudsParallaxShift.value = v;
    });

    const atmosphereFolder = debugFolder.addFolder("Atmosphere");

    atmosphereFolder.add(state, "uAtmosphereDayColor").name("Day color");
    registry.bind("uAtmosphereDayColor", (v) => {
      this.material.uniforms.uAtmosphereDayColor.value.set(v);
    });

    atmosphereFolder
      .add(state, "uAtmosphereTwilightColor")
      .name("Twilight color");
    registry.bind("uAtmosphereTwilightColor", (v) => {
      this.material.uniforms.uAtmosphereTwilightColor.value.set(v);
    });
  }

  // * 😭😭😭😭😭 Please don't
  private destroyEarth(): void {
    this.material.dispose();
    this.geometry.dispose();

    this.atmosphereMaterial.dispose();
  }

  public update(): void {
    this.mesh.rotation.y = this.time.elapsedSeconds * 0.25;

    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  public destroy(): void {
    this.scene.remove(this.mesh, this.atmosphereMesh);

    this.destroyEarth();

    this.guiRegistry?.dispose();
  }
}

export default Earth;
