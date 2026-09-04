import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const clerkPublicKey = (
    env.CLERK_HOIKU_FINANCE_PUBLIC_KEY ||
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    ""
  ).trim();
  const poppyBranch = process.env.VERCEL_GIT_COMMIT_REF === "feat/hoiku-poppy-path";
  const base = env.BASE_PATH || (poppyBranch ? "/finance/" : "/");

  return {
    base,
    plugins: [react()],
    define: {
      __HF_CLERK_PUBLIC_KEY__: JSON.stringify(clerkPublicKey),
      __HF_BASE_PATH__: JSON.stringify(base),
    },
  };
});
