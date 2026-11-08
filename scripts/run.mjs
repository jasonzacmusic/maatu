import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";
// Runs a TypeScript script with the @ alias: node scripts/run.mjs scripts/check_situations.ts
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(root + "/", { alias: { "@": root } });
await jiti.import(path.resolve(process.argv[2]));
