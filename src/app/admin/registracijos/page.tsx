import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

import { RegistrationsAdminPanel } from "@/components/admin/RegistrationsAdminPanel";

import { getRegistrations } from "@/lib/actions/admin-auth";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getContractTestModeConfig } from "@/lib/email/contract-email-override";

export const dynamic = "force-dynamic";

export default async function AdminRegistracijosPage() {

  const authenticated = await isAdminAuthenticated();



  if (!authenticated) {

    return (

      <div className="section-padding bg-vtc-gray-50">

        <div className="container-narrow mx-auto max-w-lg">

          <h1 className="font-display text-2xl font-bold text-gray-900">

            Administravimas

          </h1>

          <p className="mt-2 text-sm text-gray-500">

            Prisijunkite, norėdami peržiūrėti registracijas.

          </p>

          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">

            <AdminLoginForm />

          </div>

        </div>

      </div>

    );

  }



  const { data, error } = await getRegistrations();
  const contractTestMode = getContractTestModeConfig();

  const totalCount = data?.length ?? 0;



  return (

    <div className="section-padding bg-vtc-gray-50">

      <div className="container-narrow">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="font-display text-2xl font-bold text-gray-900">

              Registracijos

            </h1>

            <p className="mt-1 text-sm text-gray-500">

              Iš viso:{" "}

              <span className="font-semibold text-vtc-navy">{totalCount}</span>{" "}

              {totalCount === 1 ? "registracija" : "registracijos"}

            </p>

          </div>

          <AdminLogoutButton />

        </div>



        {contractTestMode.enabled ? (
          <div
            className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
            role="status"
          >
            <p className="font-semibold uppercase tracking-wide">Testavimo režimas</p>
            <p className="mt-1">Sutarties laiškai nebus siunčiami tėvams.</p>
            <p className="mt-1">
              Testinis gavėjas:{" "}
              <span className="font-medium">{contractTestMode.recipient}</span>
            </p>
          </div>
        ) : null}

        {error ? (

          <div

            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"

            role="alert"

          >

            {error}

          </div>

        ) : (

          <RegistrationsAdminPanel
            registrations={data ?? []}
            contractTestMode={contractTestMode}
          />

        )}

      </div>

    </div>

  );

}

