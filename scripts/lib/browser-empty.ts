export default {};
export const existsSync = () => false;
export const readFileSync = () => {
  throw new Error("filesystem is not available in the browser circuit bundle");
};
