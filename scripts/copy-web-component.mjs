/* eslint-disable no-undef */
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const REPO = "https://git.a-labs.space/alabsi91/web-components.git";
const REPO_NAME = "web-components";
const TEMP_DIR = join(tmpdir(), "web-components");
const COMPONENTS_DIR = join("sources", "components");

// Cleanup existing repo
if (existsSync(TEMP_DIR)) {
  await rm(TEMP_DIR, { recursive: true, force: true });
}

// Clone
try {
  await mkdir(TEMP_DIR, { recursive: true });
  await execAsync(`git clone "${REPO}"`, { cwd: TEMP_DIR });
} catch (err) {
  console.error("Failed to clone repo:", err.message);
  process.exit(1);
}

// List components
const componentsDirPath = join(TEMP_DIR, REPO_NAME, COMPONENTS_DIR);
const dirContent = await readdir(componentsDirPath, { withFileTypes: true });

const componentsList = [];
const extraFiles = [];
for (const entry of dirContent) {
  if (entry.isDirectory()) {
    componentsList.push(entry.name);
    continue;
  }

  extraFiles.push(entry.name);
}

// Ask user to select components
const selectCpQuestionPromise = Promise.withResolvers();
let rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("Available components:");
componentsList.forEach((c, i) => console.log(`${i + 1}. ${c}`));
rl.question("Choose multiple (space separated): ", answer => {
  selectCpQuestionPromise.resolve(answer);
  rl.close();
});

const selectedComponents = (await selectCpQuestionPromise.promise).split(" ").filter(c => componentsList.includes(c));

if (!selectedComponents.length) {
  console.log("No components selected. Exiting.");
  process.exit(0);
}

// Ask for target directory
let targetDir = join("sources", "components");
const targetDirQuestionPromise = Promise.withResolvers();
rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(`Target directory [${targetDir}]: `, answer => {
  targetDirQuestionPromise.resolve(answer);
  rl.close();
});
targetDir = (await targetDirQuestionPromise.promise).trim() || targetDir;

// Copy selected components
for (const component of selectedComponents) {
  const destPath = join(targetDir, component);
  if (existsSync(destPath)) {
    const overwriteQuestionPromise = Promise.withResolvers();
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Directory "${component}" already exists. Overwrite? [y/N]: `, ans => {
      overwriteQuestionPromise.resolve(ans.trim().toLowerCase());
      rl.close();
    });

    const overwrite = (await overwriteQuestionPromise.promise) === "y";
    if (!overwrite) {
      console.log(`Skipping "${component}"...`);
      continue;
    }
  }

  await copyRecursive(join(componentsDirPath, component), destPath);
}

// Copy extra files
for (const file of extraFiles) {
  const destPath = join(targetDir, file);
  await copyFile(join(componentsDirPath, file), destPath);
}

console.log("✅ Copy completed.");

// Recursive copy function
async function copyRecursive(src, dest) {
  const stats = await stat(src);
  if (stats.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src);
    for (const entry of entries) {
      await copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    await copyFile(src, dest);
  }
}
