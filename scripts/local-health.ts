/**
 * Probe official midnight-local-dev endpoints. Does not start Docker.
 * Exit 0 if the local undeployed stack answers; 2 if it is down.
 */
import { probeLocalDev, LOCAL_DEV_ENDPOINTS } from "./lib/local-probe.ts";

const health = await probeLocalDev();
console.log(JSON.stringify({ ...health, endpoints: LOCAL_DEV_ENDPOINTS }, null, 2));
if (health.operatorLock) {
  console.log("operator WalletFacade lock present — do not start midnight-local-dev (port 6300 / CPU)");
}
if (!(health.node && health.indexer && health.proof)) process.exit(2);
