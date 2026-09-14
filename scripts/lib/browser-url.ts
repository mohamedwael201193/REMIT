export const fileURLToPath = (u: string | URL) => String(u);
export const pathToFileURL = (p: string) => ({ href: p, toString: () => p });
export default { fileURLToPath, pathToFileURL };
