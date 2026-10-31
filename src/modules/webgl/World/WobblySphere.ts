import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WobblyEntityParams } from "./WobblyGroup";

class WobblySphere extends MeshEntity {
  public static readonly CONFIG = {
    radius: 2.5,
    detail: 50,
  } as const;

  private readonly group: THREE.Group;
  /** Matches the main material's vertex displacement so the shadow map's silhouette matches the wobbled surface, not the flat original geometry. Provided externally by `WobblyGroup`, shared with `WobblySuzanne`. */
  private readonly depthMaterial: THREE.Material;

  protected geometry: THREE.BufferGeometry;
  /** Provided externally by `WobblyGroup`, shared with `WobblySuzanne`. */
  protected material: THREE.Material;
  protected mesh: THREE.Mesh;

  constructor({ material, depthMaterial, group }: WobblyEntityParams) {
    super();

    this.group = group;
    this.material = material;
    this.depthMaterial = depthMaterial;

    this.setGeometry();
    this.setMesh();

    this.group.add(this.mesh);
  }

  protected setGeometry(): void {
    const { radius, detail } = WobblySphere.CONFIG;

    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    // * The IcosahedronGeometry is NOT indexed so we can't get the tangent & bit-tangent without indexing, we have duplicate vertices, to make it indexed → mergeVertices
    const indexedGeometry = mergeVertices(geometry);
    indexedGeometry.computeTangents();

    // ? Warning: merging vertices is power-consuming

    this.geometry = indexedGeometry;
  }

  protected setMaterial(): void {
    // ? Material provided externally by WobblyGroup
  }

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = this.depthMaterial;

    this.mesh = mesh;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public destroy(): void {
    this.geometry.dispose();
    // Do NOT dispose this.material. WobblyGroup owns it.
    this.group.remove(this.mesh);
  }
}

export default WobblySphere;
