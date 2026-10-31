import suzanne from "./suzanne/suzanne";

const models = [suzanne] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
