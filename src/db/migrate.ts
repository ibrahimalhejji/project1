import { ensureDatabase } from "./bootstrap";

ensureDatabase()
  .then(() => {
    console.log("[cmchub] database ready");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
