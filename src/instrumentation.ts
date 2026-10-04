export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("./db/bootstrap");
    await ensureDatabase();
  }
}
