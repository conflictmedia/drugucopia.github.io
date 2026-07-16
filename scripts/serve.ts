import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

const root = join(import.meta.dir, "..", "out");
const port = Number(Bun.env.PORT ?? 3000);

if (!existsSync(root)) {
  console.error("Missing ./out. Run `bun run build` first.");
  process.exit(1);
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    const relativePath = normalize(pathname).replace(/^[/\\]+/, "");
    let filePath = join(root, relativePath);
    let file = Bun.file(filePath);

    if (!(await file.exists()) && !pathname.includes(".")) {
      filePath = join(root, relativePath, "index.html");
      file = Bun.file(filePath);
    }

    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});

console.log(`Serving ./out at http://localhost:${port}`);
