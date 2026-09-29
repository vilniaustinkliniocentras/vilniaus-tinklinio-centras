import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { GroupsAdminPanel } from "@/components/admin/GroupsAdminPanel";
import { getAdminGroupsData } from "@/lib/actions/admin-groups";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminGrupesPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className="section-padding bg-vtc-gray-50">
        <div className="container-narrow mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Administravimas
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Prisijunkite, norėdami tvarkyti grupes ir trenerius.
          </p>
          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    );
  }

  const { data, error } = await getAdminGroupsData();

  return (
    <div className="section-padding bg-vtc-gray-50">
      <div className="container-narrow">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Grupės ir treneriai
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Treniruočių grupės, trenerių kvietimai ir priskyrimai.
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        <AdminSectionNav />

        {error || !data ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
            role="alert"
          >
            {error ?? "Nepavyko gauti duomenų."}
          </div>
        ) : (
          <GroupsAdminPanel
            groups={data.groups}
            coaches={data.coaches}
            assignments={data.assignments}
            roster={data.roster}
            rosterError={data.rosterError}
          />
        )}
      </div>
    </div>
  );
}
