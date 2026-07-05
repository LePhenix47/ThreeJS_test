import human from "./human/human";

const models = [human] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
