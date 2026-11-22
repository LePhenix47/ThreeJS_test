import { Spector } from "spectorjs";
import { Destroyable } from "@modules/webgl/Experience/Experience";

/** One-shot WebGL frame capture/inspection (every draw call, state change, shader for a single frame), distinct from PerformanceStats' continuous per-frame monitoring. */
class FrameInspector implements Destroyable {
  private instance: Spector;

  constructor() {
    this.instance = new Spector();
    this.instance.displayUI();

    console.log("FrameInspector instantiated");
  }

  // ? Spector exposes no dispose/destroy API, so its injected UI is removed manually here
  public destroy(): void {
    document.querySelector(".spector-react-capture-menu")?.remove();
    document.querySelector(".spector-react-result-view")?.remove();
  }
}

export default FrameInspector;
