import GUI from "lil-gui";
import { Destroyable } from "../../Experience";

import LEVA_CSS from "./lil-gui-debug.css?inline";

type DebuggingConstructor = { isActive: boolean; title?: string };

class Debug implements Destroyable {
  public gui: GUI;
  public isActive: boolean;
  private styleEl: HTMLStyleElement | null = null;

  constructor({ isActive, title = "Debug" }: DebuggingConstructor) {
    this.isActive = isActive;
    if (!isActive) return;

    this.gui = new GUI({ title, width: 300 });

    this.styleEl = document.createElement("style");
    this.styleEl.textContent = LEVA_CSS;
    document.head.appendChild(this.styleEl);

    console.log("Debug instantiated");
  }

  destroy = () => {
    this.gui.destroy();
    this.styleEl?.remove();
  };
}

export default Debug;
