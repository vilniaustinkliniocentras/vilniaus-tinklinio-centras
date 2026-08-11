"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateRegistrationStatus } from "@/lib/actions/admin-registrations";
import {
  REGISTRATION_STATUSES,
  statusBadgeClasses,
  statusLabels,
  type RegistrationStatus,
} from "@/lib/constants/registrations";
import type { Registration } from "@/types/database";

interface RegistrationsTableProps {
  registrations: Registration[];
  onStatusUpdated: (id: string, status: RegistrationStatus) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function displayTrainingGroup(row: Registration): string {
  return row.training_group ?? row.preferred_training_times ?? "—";
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusSelect({
  registrationId,
  currentStatus,
  onUpdated,
}: {
  registrationId: string;
  currentStatus: string;
  onUpdated: (status: RegistrationStatus) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  async function handleChange(newStatus: string) {
    if (newStatus === status || isUpdating) return;

    setIsUpdating(true);
    setError(null);

    const result = await updateRegistrationStatus(
      registrationId,
      newStatus as RegistrationStatus
    );

    if (result.success) {
      setStatus(newStatus);
      onUpdated(newStatus as RegistrationStatus);
      router.refresh();
    } else {
      setError(result.message);
    }

    setIsUpdating(false);
  }

  const badgeStatus = (status as RegistrationStatus) in statusBadgeClasses
    ? (status as RegistrationStatus)
    : "new";

  return (
    <div className="space-y-1">
      <select
        value={status}
        disabled={isUpdating}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Keisti registracijos statusą"
        className={`w-full min-w-[130px] rounded-lg border-0 py-1.5 pl-2.5 pr-8 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:ring-vtc-navy disabled:opacity-60 ${statusBadgeClasses[badgeStatus]}`}
      >
        {REGISTRATION_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <span className="text-xs text-gray-400">Atnaujinama...</span>
      )}
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function RegistrationsTable({
  registrations,
  onStatusUpdated,
}: RegistrationsTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-vtc-gray-200 bg-white lg:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-vtc-gray-200 bg-vtc-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Vaikas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Tėvas / globėjas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">El. paštas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Telefonas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Gimimo data</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Patirtis</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Grupė</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Šaltinis</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Statusas</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vtc-gray-100">
            {registrations.map((row) => (
              <tr key={row.id} className="hover:bg-vtc-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.child_name}</td>
                <td className="px-4 py-3 text-gray-700">{row.parent_name}</td>
                <td className="px-4 py-3 text-gray-700">{row.parent_email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.parent_phone}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {formatDate(row.child_birth_date)}
                </td>
                <td className="px-4 py-3 text-gray-700">{row.volleyball_experience}</td>
                <td className="max-w-[180px] px-4 py-3 text-gray-700">
                  {displayTrainingGroup(row)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {row.referral_source ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusSelect
                    registrationId={row.id}
                    currentStatus={row.status}
                    onUpdated={(status) => onStatusUpdated(row.id, status)}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {formatDateTime(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {registrations.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-vtc-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{row.child_name}</h3>
                <p className="text-sm text-gray-500">{row.parent_name}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  statusBadgeClasses[row.status as RegistrationStatus] ??
                  statusBadgeClasses.new
                }`}
              >
                {statusLabels[row.status as RegistrationStatus] ?? row.status}
              </span>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-gray-400">El. paštas</dt>
                <dd className="break-all text-gray-700">{row.parent_email}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Telefonas</dt>
                <dd className="text-gray-700">{row.parent_phone}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Gimimo data</dt>
                <dd className="text-gray-700">{formatDate(row.child_birth_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Patirtis</dt>
                <dd className="text-gray-700">{row.volleyball_experience}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Grupė</dt>
                <dd className="text-gray-700">{displayTrainingGroup(row)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Kaip sužinojo</dt>
                <dd className="text-gray-700">{row.referral_source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Registracijos data</dt>
                <dd className="text-gray-700">{formatDateTime(row.created_at)}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-vtc-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Keisti statusą
              </p>
              <StatusSelect
                registrationId={row.id}
                currentStatus={row.status}
                onUpdated={(status) => onStatusUpdated(row.id, status)}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
