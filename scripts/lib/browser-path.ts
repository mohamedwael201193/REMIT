export const dirname = () => "";
export const resolve = (...parts: string[]) => parts.filter(Boolean).join("/");
export const join = resolve;
export const fileURLToPath = (u: string) => u;
