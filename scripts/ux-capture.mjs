import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { chromium, firefox, webkit } from "playwright";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    i += 1;
  }
  return args;
}

function normalizeViewport(viewport) {
  if (!viewport) {
    return { width: 1280, height: 900 };
  }
  return {
    width: Number(viewport.width ?? 1280),
    height: Number(viewport.height ?? 900),
  };
}

function normalizeOutputDir(outputDir) {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return outputDir ?? path.join("test-results", "ux", stamp);
}

async function clickRoleTarget(page, target) {
  const locator = page.getByRole(target.role, { name: target.name });
  await locator.click();
}

async function resolveRoleLocator(page, target) {
  return page.getByRole(target.role, { name: target.name });
}

async function runAction(page, action) {
  if (action.goto) {
    await page.goto(action.goto.url, { waitUntil: action.goto.waitUntil ?? "networkidle" });
    return;
  }
  if (action.clickRole) {
    await clickRoleTarget(page, action.clickRole);
    return;
  }
  if (action.fillLabel) {
    await page.getByLabel(action.fillLabel.label).fill(action.fillLabel.value);
    return;
  }
  if (action.clickLabel) {
    await page.getByLabel(action.clickLabel.label).click();
    return;
  }
  if (action.selectRoleOption) {
    const trigger = await resolveRoleLocator(page, action.selectRoleOption.trigger);
    await trigger.click();
    await page.getByRole("option", { name: action.selectRoleOption.option }).click();
    return;
  }
  if (action.pressKey) {
    await page.keyboard.press(action.pressKey.key);
    return;
  }
  if (action.resizeViewport) {
    await page.setViewportSize({
      width: Number(action.resizeViewport.width),
      height: Number(action.resizeViewport.height),
    });
    return;
  }
  if (action.waitForRole) {
    const locator = await resolveRoleLocator(page, action.waitForRole);
    await locator.waitFor({ state: action.waitForRole.state ?? "visible" });
    return;
  }
  if (action.waitForText) {
    await page.getByText(action.waitForText.text, { exact: Boolean(action.waitForText.exact) }).waitFor({
      state: action.waitForText.state ?? "visible",
    });
    return;
  }
  if (action.waitForURL) {
    await page.waitForURL(action.waitForURL.pattern, {
      waitUntil: action.waitForURL.waitUntil ?? "networkidle",
    });
    return;
  }
  if (action.waitForTimeout) {
    await page.waitForTimeout(Number(action.waitForTimeout));
    return;
  }
  if (action.screenshot) {
    const targetPath = action.screenshot.path;
    await page.screenshot({
      path: targetPath,
      fullPage: Boolean(action.screenshot.fullPage),
    });
    return;
  }

  throw new Error(`Unsupported action: ${JSON.stringify(action)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = args.plan;
  if (!planPath) {
    throw new Error("Missing required --plan <file> argument.");
  }

  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  const outputDir = normalizeOutputDir(args.outputDir ?? plan.outputDir);
  const browserName = args.browser ?? plan.browser ?? "chromium";
  const browserType =
    browserName === "firefox" ? firefox : browserName === "webkit" ? webkit : chromium;

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await browserType.launch({
    headless: args.headed !== "true",
  });

  const page = await browser.newPage({
    viewport: normalizeViewport(plan.viewport),
  });

  for (const step of plan.steps ?? []) {
    if (step.url) {
      await page.goto(step.url, { waitUntil: step.waitUntil ?? "networkidle" });
    }

    for (const action of step.actions ?? []) {
      if (action.screenshot?.path) {
        action.screenshot.path = path.join(outputDir, action.screenshot.path);
      }
      await runAction(page, action);
    }

    if (step.screenshot) {
      await page.screenshot({
        path: path.join(outputDir, step.screenshot),
        fullPage: Boolean(step.fullPage),
      });
    }
  }

  await browser.close();
  console.log(outputDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
