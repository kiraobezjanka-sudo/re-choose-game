import { cp, mkdir, rm } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
const root = new URL("../", import.meta.url);
const files = ["index.html", "styles.css", "game.js", "game-model.js"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((file) => cp(new URL(file, root), new URL(file, output))));

console.log(`Built ${files.length} files into dist/`);
