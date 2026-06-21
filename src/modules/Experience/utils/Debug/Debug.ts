import GUI from "lil-gui";
import { Destroyable } from "@modules/Experience/Experience";

import LEVA_CSS from "./lil-gui-debug.css?inline";

type DebuggingConstructor = { isActive: boolean; title?: string };

class Debug implements Destroyable {
  public readonly gui: GUI;
  public isActive: boolean;
  private readonly sheet: CSSStyleSheet;

  constructor({ isActive, title = "Debug" }: DebuggingConstructor) {
    this.isActive = isActive;
    if (!isActive) return;

    this.gui = new GUI({ title, width: 300 });
    this.sheet = new CSSStyleSheet();

    this.initLilGuiStyleSheets();

    console.log("Debug instantiated");
  }

  private initLilGuiStyleSheets = () => {
    this.sheet.replaceSync(LEVA_CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
  };

  private destroyLilGuiStyleSheets = () => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (s) => s !== this.sheet,
    );
  };

  destroy = () => {
    this.gui.destroy();

    this.destroyLilGuiStyleSheets();
  };
}

export default Debug;
