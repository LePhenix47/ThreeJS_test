const models = [] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
