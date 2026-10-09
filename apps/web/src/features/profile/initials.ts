/** «Camila Ríos» → «CR»: the avatar until players can upload one. */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? '')
    .join('');
}
