import { type NextRequest } from "next/server";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin/auth";
import { createSignedContractDownloadUrl } from "@/lib/storage/signed-contracts";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAdminAuthenticatedFromRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const result = await createSignedContractDownloadUrl(id);

  if (!result.success) {
    return new Response(result.message, { status: 404 });
  }

  return Response.redirect(result.url);
}
