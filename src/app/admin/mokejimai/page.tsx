import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { PaymentsAdminPanel } from "@/components/admin/PaymentsAdminPanel";
import { SebStatementImport } from "@/components/admin/SebStatementImport";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { adminLoadPaymentsBilling } from "@/lib/admin/billing";
import {
  defaultBillingMonth,
  formatBillingMonthLt,
  isAllowedBillingMonth,
  paymentsMonthUrl,
} from "@/lib/admin/billing-month";

export const dynamic = "force-dynamic";

function firstSearchValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export default async function AdminMokejimaiPage({
  searchParams,
}: {
  searchParams: Promise<{ menuo?: string | string[] }>;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className="section-padding bg-vtc-gray-50">
        <div className="container-narrow mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Administravimas
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Prisijunkite, norėdami peržiūrėti mokėjimus.
          </p>
          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    );
  }

  const query = await searchParams;
  const requestedMonth = firstSearchValue(query.menuo);
  if (!requestedMonth || !isAllowedBillingMonth(requestedMonth)) {
    redirect(paymentsMonthUrl(defaultBillingMonth()));
  }

  const billingResult = await adminLoadPaymentsBilling(requestedMonth);
  const unallocatedCount = billingResult.success
    ? billingResult.data.bankRows.filter((row) => row.unallocatedCents > 0).length
    : 0;

  return (
    <div className="section-padding bg-vtc-gray-50">
      <div className="container-narrow">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Mokėjimai</h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatBillingMonthLt(requestedMonth)}
              {billingResult.success ? (
                <>
                  {" · "}
                  <span className="font-semibold text-vtc-navy">
                    {billingResult.data.monthRows.length}
                  </span>{" "}
                  sportininkai
                  {unallocatedCount > 0
                    ? ` · ${unallocatedCount} nepriskirtos banko operacijos`
                    : ""}
                </>
              ) : null}
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        <AdminSectionNav />

        {billingResult.success ? (
          <PaymentsAdminPanel data={billingResult.data} />
        ) : (
          <div className="space-y-6">
            <div
              className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
              role="alert"
            >
              {billingResult.message}
            </div>
            <SebStatementImport />
          </div>
        )}
      </div>
    </div>
  );
}
