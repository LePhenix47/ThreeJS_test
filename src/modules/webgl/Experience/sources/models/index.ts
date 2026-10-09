import particlesModel from "./particles/model";

const models = [particlesModel] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
