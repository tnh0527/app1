import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waitOn from "wait-on";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const reactRoot = path.resolve(__dirname, "..");
const djangoRootCandidates = [
  path.resolve(repoRoot, "backend"),
  path.resolve(repoRoot, "django-app"),
];

const djangoRoot = djangoRootCandidates.find((candidate) =>
  fs.existsSync(path.resolve(candidate, "app1", "manage.py"))
);

if (!djangoRoot) {
  console.error(
    `Could not find Django project. Tried: ${djangoRootCandidates.join(", ")}`
  );
  process.exit(1);
}

const manageDir = path.resolve(djangoRoot, "app1");
const managePy = path.resolve(manageDir, "manage.py");

const frontendPort = Number(process.env.FRONTEND_PORT || 5173);
const backendPort = Number(process.env.BACKEND_PORT || 8000);

function resolvePython() {
  if (process.env.DJANGO_PYTHON) return process.env.DJANGO_PYTHON;

  const venvPythonCandidates = [
    path.resolve(djangoRoot, "djangoenv", "Scripts", "python.exe"),
    // If the backend code has been moved but the local venv is still in the old folder.
    path.resolve(repoRoot, "django-app", "djangoenv", "Scripts", "python.exe"),
  ];

  const venvPython = venvPythonCandidates.find((candidate) =>
    fs.existsSync(candidate)
  );
  if (process.platform === "win32" && venvPython) return venvPython;

  return "python";
}

function resolveNpm() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function startProcess(command, args, options) {
  const shouldUseShell =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(String(command));

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: shouldUseShell,
    ...options,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      // Let the parent process die so Playwright can report the failure.
      process.exitCode = code;
    }
  });

  return child;
}

const python = resolvePython();
const npm = resolveNpm();

if (!fs.existsSync(managePy)) {
  console.error(`Could not find manage.py at: ${managePy}`);
  process.exit(1);
}

const backend = startProcess(
  python,
  [managePy, "runserver", String(backendPort)],
  { cwd: manageDir, env: process.env }
);

const frontend = startProcess(
  npm,
  ["run", "dev", "--", "--port", String(frontendPort)],
  { cwd: reactRoot, env: process.env }
);

const resources = [
  `tcp:localhost:${backendPort}`,
  `tcp:localhost:${frontendPort}`,
];

await waitOn({ resources, timeout: 180_000 });

const shutdown = () => {
  backend.kill("SIGINT");
  frontend.kill("SIGINT");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep process alive while children are running.
await new Promise(() => {});
