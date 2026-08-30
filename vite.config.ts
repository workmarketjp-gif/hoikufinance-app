import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clerkPublicKey = (
    env.CLERK_HOIKU_FINANCE_PUBLIC_KEY ||
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    ""
  ).trim();

  return {
    plugins: [react()],
    define: {
      __HF_CLERK_PUBLIC_KEY__: JSON.stringify(clerkPublicKey),
    },
  };
});
