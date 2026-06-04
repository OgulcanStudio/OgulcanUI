/**
 * Exit non-zero if Bun is not the runtime (OgulcanUI is Bun-only).
 */
if (!process.versions.bun) {
  console.error('OgulcanUI requires Bun. Install: https://bun.sh — then run: bun run build');
  process.exit(1);
}