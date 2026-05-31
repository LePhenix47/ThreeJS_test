import GUI from "lil-gui";
import { Destroyable } from "../Experience";

type DebuggingConstructor = { isActive: boolean; title?: string };

class Debug implements Destroyable {
  public gui: GUI;
  public isActive: boolean;

  constructor({ isActive, title = "Debug" }: DebuggingConstructor) {
    this.isActive = isActive;
    if (!isActive) return;

    this.gui = new GUI({ title });

    console.log("Debug instantiated");
  }

  destroy = () => {
    this.gui.destroy();
  };
}

export default Debug;
