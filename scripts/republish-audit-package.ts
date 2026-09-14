/**
 * Re-publish the executor one-field residual disclosure if Render wiped receipts.
 * Package was generated against on-chain auditRoots head after fill 5f1203cf.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";

const pkg = {
  fillIndex: 3,
  auditRootHex: "1bbc1cc2aa2cd83de56cb8ea15ec5dfb8dd071cf2fb305980416ed726b81a694",
  executionTxHash: "5f1203cf9cdde32192f4a2cdce275ff34529b19bbe24644f6014b1c24f12b99f",
  commitmentsHex: [
    "e244e866f139448ec69687a213cc3d1e394be2bd7faa127dd15eecbade3f7459",
    "8b81300b9a3c281e42229383d20a7d6982827336cedfb3727a2eac35fcbb424f",
    "e242bebaf0dfcc72d3943fac3e17cf0c2b0e956d2980dd0499d68c9bff6dd69d",
    "427fdd93bdcd95cc710e09540e24c13d9ac9e3c1b7818e2a6cb8b3b86bbea492",
    "405eaff66755017def0220c44742b84e01bc0d2e44d10e59f7bc7c3541e2a3bc",
    "394b0c92adc61ebf90a09c96e7ce32de3bca0274bc07b81de7a40bf6b01e99e1",
  ],
  openings: [
    {
      idx: 1,
      field: "baseAmount",
      saltHex: "758afc21c3928eae44bb8c3e1bdcca2332b5470b2898d38999284f1c9d3543ba",
      valueDec: "30",
    },
  ],
};

async function main() {
  if (!admin) throw new Error("REMIT_API_ADMIN_TOKEN missing");
  const pub = await fetch(`${API}/audit/publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" },
    body: JSON.stringify({ package: pkg }),
  });
  const got = await fetch(`${API}/audit/package`);
  const g = (await got.json()) as { openings?: { field?: string }[] };
  const v = await fetch(`${API}/audit/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ package: pkg }),
  });
  const vj = (await v.json()) as { ok?: boolean; fields?: string[] };
  console.log(
    JSON.stringify({
      publish: pub.status,
      get: got.status,
      field: g.openings?.[0]?.field,
      verify: vj.ok,
      fields: vj.fields,
    }),
  );
  if (pub.status !== 200 || got.status !== 200 || vj.ok !== true) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
