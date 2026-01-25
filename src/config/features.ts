export function detectAstro(files: string[]): boolean {
    for (const file of files) {
        const rel = file.toLowerCase();
        if (rel.endsWith(".astro")) {
            return true;
        }
        if (
            rel.endsWith("/astro.config.mjs") ||
            rel.endsWith("/astro.config.cjs") ||
            rel.endsWith("/astro.config.js") ||
            rel.endsWith("/astro.config.ts")
        ) {
            return true;
        }
    }
    return false;
}
