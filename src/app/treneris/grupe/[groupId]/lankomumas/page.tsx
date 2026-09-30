import Link from "next/link";
import { redirect } from "next/navigation";
import { AttendanceForm } from "@/components/coach/AttendanceForm";
import { fetchCoachGroupRosterForDate } from "@/lib/coach/attendance";
import {
  getAssignedTrainingGroups,
  requireActiveCoach,
} from "@/lib/coach/auth";
import {
  isAllowedAttendanceDate,
  isUuid,
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

export default async function CoachAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ data?: string | string[] }>;
}) {
  const coach = await requireActiveCoach();
  const { groupId } = await params;
  const query = await searchParams;
  const today = vilniusTodayIsoDate();

  if (!isUuid(groupId)) {
    return (
      <AttendanceUnavailable
        title="Neteisinga grupė."
        message="Šios grupės lankomumo žymėti negalima."
      />
    );
  }

  const groups = await getAssignedTrainingGroups(coach.id);
  const group = groups.find((item) => item.id === groupId);

  if (!group) {
    return (
      <AttendanceUnavailable
        title="Ši grupė jums nepriskirta."
        message="Galite žymėti lankomumą tik savo treniruočių grupėse."
      />
    );
  }

  const requestedDate = firstSearchValue(query.data);
  if (!requestedDate || !isAllowedAttendanceDate(requestedDate, today)) {
    redirect(`/treneris/grupe/${groupId}/lankomumas?data=${today}`);
  }

  const rosterResult = await fetchCoachGroupRosterForDate(groupId, requestedDate);

  return (
    <div className="bg-vtc-gray-50 px-4 py-8 sm:px-8 sm:py-12">
      <div className="container-narrow mx-auto max-w-lg">
        <Link
          href="/treneris"
          className="text-sm font-medium text-vtc-blue-700 hover:text-vtc-blue-800"
        >
          ← Grupės
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">
          Lankomumas
        </h1>
        <p className="mt-2 text-base text-gray-700">{group.name}</p>

        <div className="mt-6">
          <AttendanceForm
            key={requestedDate}
            groupId={group.id}
            groupName={group.name}
            sessionDate={requestedDate}
            vilniusToday={today}
            athletes={rosterResult.success ? rosterResult.roster.athletes : []}
            loadError={rosterResult.success ? null : rosterResult.message}
          />
        </div>
      </div>
    </div>
  );
}

function AttendanceUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="bg-vtc-gray-50 px-4 py-8 sm:px-8 sm:py-12">
      <div className="container-narrow mx-auto max-w-lg">
        <Link
          href="/treneris"
          className="text-sm font-medium text-vtc-blue-700 hover:text-vtc-blue-800"
        >
          ← Grupės
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">
          Lankomumas
        </h1>
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-red-700" role="alert">
            {title}
          </p>
          <p className="mt-2 text-sm text-gray-700">{message}</p>
        </div>
      </div>
    </div>
  );
}
