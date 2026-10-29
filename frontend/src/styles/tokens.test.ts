import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("components contain no hard-coded colors or arbitrary color classes", () => {
  const files = walk("src").filter((f) => /\.tsx$/.test(f) && !f.endsWith(".test.tsx"));
  const offenders = files.filter((f) => {
    const src = readFileSync(f, "utf8");
    return /#[0-9a-fA-F]{3,8}\b/.test(src) || /\b(bg|text|border)-\[#/.test(src) || /rgb\(/.test(src);
  });
  expect(offenders).toEqual([]);
});

test("required semantic tokens are defined in both themes", () => {
  const css = readFileSync("src/styles/design-tokens.css", "utf8");
  for (const t of ["primary", "secondary", "accent", "background", "surface", "text", "muted", "border", "success", "warning", "danger"]) {
    const re = new RegExp(`--color-${t}:`, "g");
    expect((css.match(re) ?? []).length).toBeGreaterThanOrEqual(2);
  }
});
