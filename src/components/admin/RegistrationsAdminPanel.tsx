"use client";

import { useEffect, useMemo, useState } from "react";
import type { Registration } from "@/types/database";
import {
  REGISTRATION_STATUSES,
  type RegistrationStatus,
} from "@/lib/constants/registrations";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";

interface RegistrationsAdminPanelProps {
  registrations: Registration[];
}

export function RegistrationsAdminPanel({ registrations }: RegistrationsAdminPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "all">("all");
  const [localRegistrations, setLocalRegistrations] = useState(registrations);

  useEffect(() => {
    setLocalRegistrations(registrations);
  }, [registrations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return localRegistrations
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (!query) return true;

        return (
          row.child_name.toLowerCase().includes(query) ||
          row.parent_name.toLowerCase().includes(query) ||
          row.parent_email.toLowerCase().includes(query) ||
          row.parent_phone.toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [localRegistrations, search, statusFilter]);

  function handleStatusUpdated(id: string, status: RegistrationStatus) {
    setLocalRegistrations((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status } : row))
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-vtc-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label htmlFor="admin-search" className="mb-1.5 block text-sm font-medium text-gray-700">
              Paieška
            </label>
            <input
              id="admin-search"
              type="search"
              placeholder="Vaikas, tėvas, el. paštas, telefonas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-vtc-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10"
            />
          </div>

          <div>
            <label htmlFor="admin-status-filter" className="mb-1.5 block text-sm font-medium text-gray-700">
              Statusas
            </label>
            <select
              id="admin-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RegistrationStatus | "all")
              }
              className="w-full rounded-lg border border-vtc-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-vtc-navy focus:ring-2 focus:ring-vtc-navy/10 sm:min-w-[180px]"
            >
              <option value="all">Visi statusai</option>
              {REGISTRATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Rodoma: <span className="font-medium text-gray-700">{filtered.length}</span> iš{" "}
          <span className="font-medium text-gray-700">{localRegistrations.length}</span> registracijų
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-vtc-gray-200 bg-white p-8 text-center text-gray-500">
          {localRegistrations.length === 0
            ? "Registracijų dar nėra."
            : "Pagal pasirinktus filtrus registracijų nerasta."}
        </p>
      ) : (
        <RegistrationsTable
          registrations={filtered}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
