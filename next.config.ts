import type { NextConfig } from "next";

const contractPdfAssets = [
  "./src/lib/contracts/assets/extracted-contract-html.html",
  "./src/lib/contracts/assets/NotoSans-Regular.ttf",
  "./src/lib/contracts/assets/NotoSans-Bold.ttf",
];

const pdfkitRuntimeAssets = [
  "./node_modules/pdfkit/js/standard-fonts/**/*",
  "./node_modules/pdfkit/js/data/**/*",
];

const contractPdfTracingIncludes = [
  ...contractPdfAssets,
  ...pdfkitRuntimeAssets,
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/admin/registrations/[id]/contract": contractPdfTracingIncludes,
    "/admin/registracijos": contractPdfTracingIncludes,
    "/*": pdfkitRuntimeAssets,
  },
  images: {
    qualities: [75, 90],
  },
};

export default nextConfig;
