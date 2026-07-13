import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client pulls in the native `libsql` addon (used only for the
  // local file:// fallback in dev). Keeping it external stops the bundler
  // from trying to package the native binary, which is the recommended
  // approach for this kind of dependency on Vercel's serverless runtime.
  serverExternalPackages: ["libsql", "@libsql/client"],
};

export default nextConfig;
