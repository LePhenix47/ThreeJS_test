import gears from "./gears/gears";

const models = [gears] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
