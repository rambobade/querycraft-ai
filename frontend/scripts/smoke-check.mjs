import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");

console.log("Running QueryCraft AI frontend verification checks...\n");

let passed = true;

function check(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    passed = false;
  }
}

// 1. Verify CSS tokens
check("CSS tokens are defined for light and dark modes", () => {
  const tokensPath = path.join(frontendDir, "app", "tokens.css");
  if (!fs.existsSync(tokensPath)) throw new Error("app/tokens.css is missing");
  const content = fs.readFileSync(tokensPath, "utf-8");
  const requiredVars = [
    "--bg",
    "--surface",
    "--border",
    "--text",
    "--text-muted",
    "--accent",
    "--danger",
    "--success",
    "--warning",
  ];
  for (const v of requiredVars) {
    if (!content.includes(v)) throw new Error(`Missing token: ${v}`);
  }
});

// 2. Verify Zero Tailwind
check("Zero Tailwind CSS references in codebase", () => {
  function scan(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f === "node_modules" || f === ".next" || f === "package-lock.json") continue;
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (/\.(tsx?|jsx?|css|html|json)$/.test(f)) {
        const text = fs.readFileSync(fullPath, "utf-8");
        if (text.includes("tailwindcss") || text.includes("@tailwind")) {
          throw new Error(`Found Tailwind reference in ${fullPath}`);
        }
      }
    }
  }
  scan(frontendDir);
});

// 3. Verify core pages exist
check("All primary routes exist", () => {
  const routes = [
    "app/query/page.tsx",
    "app/library/page.tsx",
    "app/connections/page.tsx",
    "app/settings/page.tsx",
    "app/login/page.tsx",
    "app/register/page.tsx",
  ];
  for (const r of routes) {
    const p = path.join(frontendDir, r);
    if (!fs.existsSync(p)) throw new Error(`Route missing: ${r}`);
  }
});

// 4. Verify UI component primitives
check("All UI components exist and export cleanly", () => {
  const uiIndex = path.join(frontendDir, "components", "ui", "index.ts");
  if (!fs.existsSync(uiIndex)) throw new Error("components/ui/index.ts missing");
  const primitives = [
    "Button.tsx",
    "Input.tsx",
    "Textarea.tsx",
    "Select.tsx",
    "Field.tsx",
    "Notice.tsx",
    "Dialog.tsx",
    "ConfirmDialog.tsx",
    "Toast.tsx",
    "Tabs.tsx",
    "Table.tsx",
    "EmptyState.tsx",
    "Spinner.tsx",
    "Kbd.tsx",
    "Menu.tsx",
  ];
  for (const prim of primitives) {
    const p = path.join(frontendDir, "components", "ui", prim);
    if (!fs.existsSync(p)) throw new Error(`Missing primitive component: ${prim}`);
  }
});

if (passed) {
  console.log("\nAll frontend checks passed successfully.");
  process.exit(0);
} else {
  console.error("\nSome frontend checks failed.");
  process.exit(1);
}
