import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { PaymentsAdminPanel } from "@/components/admin/PaymentsAdminPanel";
import { getRegistrations } from "@/lib/actions/admin-auth";
import { getBankImports, getBankTransactions } from "@/lib/actions/admin-payments";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminMokejimaiPage() {
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

  const [transactionsResult, importsResult, registrationsResult] = await Promise.all([
    getBankTransactions(),
    getBankImports(),
    getRegistrations(),
  ]);

  const error =
    transactionsResult.error ?? importsResult.error ?? registrationsResult.error;
  const transactions = transactionsResult.data ?? [];
  const imports = importsResult.data ?? [];
  const registrations = registrationsResult.data ?? [];

  return (
    <div className="section-padding bg-vtc-gray-50">
      <div className="container-narrow">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Mokėjimai</h1>
            <p className="mt-1 text-sm text-gray-500">
              Iš viso:{" "}
              <span className="font-semibold text-vtc-navy">{transactions.length}</span>{" "}
              {transactions.length === 1 ? "mokėjimas" : "mokėjimai"}
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        <AdminSectionNav />

        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : (
          <PaymentsAdminPanel
            transactions={transactions}
            imports={imports}
            registrations={registrations}
          />
        )}
      </div>
    </div>
  );
}
