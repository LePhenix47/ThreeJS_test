import StatsGL from "stats-gl";
import * as THREE from "three";
import { Destroyable, Updatable } from "@modules/webgl/Experience/Experience";

type PerformanceStatsConstructor = {
  renderer: THREE.WebGLRenderer;
};

/** Only ever instantiated by `Debug` when debug mode is active, so no `isActive` gating is needed here. */
class PerformanceStats implements Updatable, Destroyable {
  private instance: StatsGL;

  constructor({ renderer }: PerformanceStatsConstructor) {
    this.instance = new StatsGL({ trackGPU: true });
    this.instance.init(renderer);
    document.body.appendChild(this.instance.dom);

    console.log("PerformanceStats instantiated");
  }

  public update(): void {
    this.instance.update();
  }

  public destroy(): void {
    this.instance.dom.remove();
  }
}

export default PerformanceStats;
