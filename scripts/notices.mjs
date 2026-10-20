import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
let output =
  "# Third-party notices\n\nProduction dependency licenses. Generated from the locked installed packages.\n";
for (const [folder, meta] of Object.entries(lock.packages)) {
  if (!folder || meta.dev) continue;
  const pkg = JSON.parse(
    fs.readFileSync(path.join(folder, "package.json"), "utf8"),
  );
  const files = fs
    .readdirSync(folder)
    .filter(
      (f) =>
        /^(licen[sc]e|copying|copyright)(\.|$)/i.test(f) &&
        fs.statSync(path.join(folder, f)).isFile(),
    );
  output += `\n## ${pkg.name} ${pkg.version}\n\nLicense: ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license)}\n`;
  for (const file of files)
    output += `\n### ${file}\n\n\`\`\`text\n${fs.readFileSync(path.join(folder, file), "utf8")}\n\`\`\`\n`;
  if (!files.length)
    output +=
      "\nNo standalone license file in npm package; see upstream repository for complete terms.\n";
}
fs.writeFileSync("THIRD_PARTY_NOTICES.md", output);
fs.writeFileSync("public/licenses.txt", output);
