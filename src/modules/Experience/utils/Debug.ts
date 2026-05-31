import GUI from "lil-gui";

type DebuggingConstructor = { isActive: boolean; title?: string };

class Debug {
  public gui: GUI;
  public isActive: boolean;

  constructor({ isActive, title = "Debug" }: DebuggingConstructor) {
    this.isActive = isActive;
    if (!isActive) return;

    this.gui = new GUI({ title });

    console.log("Debug instantiated");
  }
}

export default Debug;
