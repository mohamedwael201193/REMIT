// Local declaration shims for packages whose npm tarballs omit .d.ts.
// @noble/hashes 1.8.0 and @noble/curves 1.9.7 ship only .d.ts.map (no .d.ts);
// postgres 3.4.9 is missing types/index.d.ts. These declarations silence
// TS7016 (implicit any) so `tsc` passes. They do not change runtime behavior.
declare module "@noble/hashes/blake2b";
declare module "@noble/hashes/blake2s";
declare module "@noble/hashes/sha256";
declare module "@noble/hashes/sha2";
declare module "@noble/hashes/sha3";
declare module "@noble/curves/ed25519";
declare module "postgres";
