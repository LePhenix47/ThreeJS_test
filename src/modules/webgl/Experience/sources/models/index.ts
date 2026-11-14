import damagedHelmet from "./damaged-helmet/damaged-helmet";

const models = [damagedHelmet] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
