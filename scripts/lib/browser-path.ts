export const dirname = (p = "") => {
  const n = String(p).replace(/\\/g, "/");
  const i = n.lastIndexOf("/");
  return i <= 0 ? "" : n.slice(0, i);
};
export const resolve = (...parts: string[]) => parts.filter(Boolean).join("/");
export const join = resolve;
export const fileURLToPath = (u: string) => String(u);
export const basename = (p: string) => String(p).replace(/\\/g, "/").split("/").pop() ?? p;
export default { dirname, resolve, join, fileURLToPath, basename };
