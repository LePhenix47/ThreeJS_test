export interface Resizable {
  resize(): void;
}
export interface Updatable {
  update(...args: any[]): void;
}
export interface Destroyable {
  destroy(...args: any[]): void;
}
