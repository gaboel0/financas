// Roda uma vez no startup do servidor: migra o banco, sincroniza e agenda sync a cada 6h.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as unknown as { __fcScheduler?: boolean };
    if (g.__fcScheduler) return;
    g.__fcScheduler = true;
    const { startScheduler } = await import("@/server/pluggy/scheduler");
    startScheduler();
  }
}
