// next.config.js
import path from "path";

export default {
  reactStrictMode: true,
  webpack: (config) => {
    // "@/..." => корінь проєкту
    config.resolve.alias["@"] = path.resolve(process.cwd());
    return config;
  },
};
