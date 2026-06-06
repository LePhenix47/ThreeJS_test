import fox from "./fox/fox";

const models = [fox] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
