import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AttendanceAdminPanel } from "@/components/admin/AttendanceAdminPanel";
import { AttendanceMonthlyPanel } from "@/components/admin/AttendanceMonthlyPanel";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  adminLoadAttendanceView,
  adminLoadMonthlyAttendanceView,
} from "@/lib/admin/attendance";
import { isUuid } from "@/lib/admin/coaches-groups";
import {
  isAllowedAttendanceDate,
  isAllowedAttendanceMonth,
  vilniusCurrentMonth,
  vilniusTodayIsoDate,
} from "@/lib/coach/dates";

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

export default async function AdminLankomumasPage({
  searchParams,
}: {
  searchParams: Promise<{
    grupe?: string | string[];
    data?: string | string[];
    vaizdas?: string | string[];
    menuo?: string | string[];
  }>;
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
            Prisijunkite, norėdami peržiūrėti lankomumą.
          </p>
          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    );
  }

  const query = await searchParams;
  const today = vilniusTodayIsoDate();
  const currentMonth = vilniusCurrentMonth();
  const requestedDate = firstSearchValue(query.data);
  const requestedGroup = firstSearchValue(query.grupe);
  const requestedMonth = firstSearchValue(query.menuo);
  const isMonthly = firstSearchValue(query.vaizdas) === "menuo";
  const validGroupId =
    requestedGroup && isUuid(requestedGroup) ? requestedGroup : null;

  if (isMonthly) {
    if (!requestedMonth || !isAllowedAttendanceMonth(requestedMonth, currentMonth)) {
      const params = new URLSearchParams();
      params.set("vaizdas", "menuo");
      params.set("menuo", currentMonth);
      if (validGroupId) {
        params.set("grupe", validGroupId);
      }
      redirect(`/admin/lankomumas?${params.toString()}`);
    }

    const view = await adminLoadMonthlyAttendanceView(requestedGroup, requestedMonth);

    return (
      <div className="section-padding bg-vtc-gray-50">
        <div className="container-narrow mx-auto max-w-lg">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Lankomumas
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Trenerių pažymėtas lankomumas pagal grupę ir mėnesį.
              </p>
            </div>
            <AdminLogoutButton />
          </div>

          <AdminSectionNav />

          <AttendanceMonthlyPanel
            groups={view.groups}
            selectedGroupId={view.selectedGroupId}
            month={requestedMonth}
            vilniusCurrentMonth={currentMonth}
            sessionCount={view.sessionCount}
            sessionDates={view.sessionDates}
            athletes={view.athletes}
            groupError={view.groupError}
            loadError={view.loadError}
          />
        </div>
      </div>
    );
  }

  if (!requestedDate || !isAllowedAttendanceDate(requestedDate, today)) {
    const params = new URLSearchParams();
    params.set("data", today);
    if (validGroupId) {
      params.set("grupe", validGroupId);
    }
    redirect(`/admin/lankomumas?${params.toString()}`);
  }

  const view = await adminLoadAttendanceView(requestedGroup, requestedDate);

  return (
    <div className="section-padding bg-vtc-gray-50">
      <div className="container-narrow mx-auto max-w-lg">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Lankomumas
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Trenerių pažymėtas lankomumas pagal grupę ir datą.
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        <AdminSectionNav />

        <AttendanceAdminPanel
          groups={view.groups}
          selectedGroupId={view.selectedGroupId}
          sessionDate={requestedDate}
          vilniusToday={today}
          sessionExists={view.sessionExists}
          recorderNames={view.recorderNames}
          lastMarkedAtIso={view.lastMarkedAtIso}
          athletes={view.athletes}
          groupError={view.groupError}
          loadError={view.loadError}
        />
      </div>
    </div>
  );
}
