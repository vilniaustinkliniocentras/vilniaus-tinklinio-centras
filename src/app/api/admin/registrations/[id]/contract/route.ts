import { type NextRequest } from "next/server";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin/auth";
import { fetchRegistrationById } from "@/lib/admin/registrations";
import { generateContractPdf } from "@/lib/contracts/generate-contract-pdf";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const registration = await fetchRegistrationById(id);

  if (!registration) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { buffer, filename } = await generateContractPdf(registration);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Contract PDF generation failed:", error instanceof Error ? error.message : error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
