import GUI from "lil-gui";
import * as THREE from "three";
import { Destroyable, Updatable } from "@modules/webgl/Experience/Experience";
import PerformanceStats from "./PerformanceStats";

import LEVA_CSS from "./lil-gui-debug.css?inline";

type DebuggingConstructor = {
  isActive: boolean;
  title?: string;
  renderer: THREE.WebGLRenderer;
};

class Debug implements Updatable, Destroyable {
  public readonly gui: GUI;
  public isActive: boolean;
  public stats: PerformanceStats;
  private readonly sheet: CSSStyleSheet;

  constructor({ isActive, title = "Debug", renderer }: DebuggingConstructor) {
    this.isActive = isActive;
    if (!isActive) return;

    this.gui = new GUI({ title, width: 300 });
    this.sheet = new CSSStyleSheet();

    this.initLilGuiStyleSheets();

    this.stats = new PerformanceStats({ renderer });

    console.log("Debug instantiated");
  }

  private initLilGuiStyleSheets(): void {
    this.sheet.replaceSync(LEVA_CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
  }

  private destroyLilGuiStyleSheets(): void {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (s) => s !== this.sheet,
    );
  }

  public update(): void {
    this.stats.update();
  }

  public destroy(): void {
    this.gui.destroy();

    this.destroyLilGuiStyleSheets();
    this.stats.destroy();
  }
}

export default Debug;
