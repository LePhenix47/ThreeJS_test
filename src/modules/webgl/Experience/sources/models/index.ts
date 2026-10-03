import particlesModels from "./particles/models";

const models = [particlesModels] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
