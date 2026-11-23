import flightHelmet from "./flight-helmet";

const models = [flightHelmet] as const;
export type ModelNames = (typeof models)[number]["name"];

export default models;
