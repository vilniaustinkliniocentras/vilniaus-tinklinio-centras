import type { NextConfig } from "next";

const contractPdfAssets = [
  "./src/lib/contracts/assets/extracted-contract-html.html",
  "./src/lib/contracts/assets/NotoSans-Regular.ttf",
  "./src/lib/contracts/assets/NotoSans-Bold.ttf",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/admin/registrations/[id]/contract": contractPdfAssets,
    "/admin/registracijos": contractPdfAssets,
  },
  images: {
    qualities: [75, 90],
  },
};

export default nextConfig;
