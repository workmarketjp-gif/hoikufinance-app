import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const clerkPublicKey = (env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
  const base = env.BASE_PATH || "/";

  return {
    base,
    plugins: [react()],
    define: {
      __HF_CLERK_PUBLIC_KEY__: JSON.stringify(clerkPublicKey),
      __HF_BASE_PATH__: JSON.stringify(base),
    },
  };
});
