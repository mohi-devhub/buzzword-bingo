// Copies the frozen selection note and font licenses into the static public assets.
// Keeps methodology links and required font attribution available without a server.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectRoot } from "../src/files.js";

await mkdir(join(projectRoot, "public/licenses"), { recursive: true });
await copyFile(
  join(projectRoot, "COMPARISON.md"),
  join(projectRoot, "public/COMPARISON.md"),
);
for (const font of ["barlow-condensed", "public-sans"]) {
  const license = await readFile(
    join(projectRoot, `node_modules/@fontsource/${font}/LICENSE`),
    "utf8",
  );
  await writeFile(
    join(projectRoot, `public/licenses/${font}.txt`),
    `# Contains the original ${font} font license.\n# Preserves the license for the self-hosted typeface used by this site.\n${license}`,
  );
}
process.stdout.write(
  "Prepared static methodology and font licenses. Crawl credits used: 0.\n",
);
