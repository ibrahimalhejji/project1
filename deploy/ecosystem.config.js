// PM2 process file: pm2 start ecosystem.config.js
const fs = require("node:fs");
const path = require("node:path");

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (match && !line.trim().startsWith("#")) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: "cmchub-net",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "0.0.0.0", ...loadEnv(path.join(__dirname, ".env")) },
      max_memory_restart: "512M",
      out_file: "./logs/out.log",
      error_file: "./logs/err.log",
    },
  ],
};
