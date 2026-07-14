import coffeeSmoke from "./coffee-smoke/coffee-smoke";

const models = [coffeeSmoke] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
