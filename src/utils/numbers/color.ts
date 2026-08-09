export function getRandomHexColor(): string {
  return `#${Math.random().toString(16).slice(2, 8)}`;
}
