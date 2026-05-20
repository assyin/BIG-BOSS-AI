"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Users, Mail, CheckCircle, Clock, XCircle, Download } from "lucide-react";

const API = "http://localhost:5050";

interface BetaInvitation {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  city?: string | null;
  source: string;
  status: "Pending" | "Invited" | "Accepted" | "Rejected";
  inviteCode?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  invitedAt?: string | null;
  acceptedAt?: string | null;
}

/**
 * Sprint 6.5 — Admin gestion beta invitations.
 */
export default function BetaAdminPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<BetaInvitation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/"); return; }
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const r = await axios.get(`${API}/api/beta/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setInvitations(r.data.invitations || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const token = localStorage.getItem("token");
    await axios.post(`${API}/api/beta/${id}/update-status`, { status, adminNotes: null }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  const downloadCsv = async () => {
    const token = localStorage.getItem("token");
    const r = await axios.get(`${API}/api/beta/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beta-invitations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;

  const stats = {
    pending: invitations.filter((i) => i.status === "Pending").length,
    invited: invitations.filter((i) => i.status === "Invited").length,
    accepted: invitations.filter((i) => i.status === "Accepted").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="w-7 h-7 text-orange-500" /> Beta privée
            </h1>
            <p className="text-gray-500 mt-1">{total} inscrits · Cible 500</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCsv} className="px-4 py-2 bg-orange-500 text-white rounded flex items-center gap-2 hover:bg-orange-600">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <a href="/dashboard" className="text-sm text-orange-600 hover:underline self-center">← Dashboard</a>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total inscrits" value={total} icon={<Users className="w-5 h-5" />} color="blue" />
          <StatCard label="En attente" value={stats.pending} icon={<Clock className="w-5 h-5" />} color="yellow" />
          <StatCard label="Invités" value={stats.invited} icon={<Mail className="w-5 h-5" />} color="purple" />
          <StatCard label="Acceptés" value={stats.accepted} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          {[
            { val: "", label: "Tous" },
            { val: "Pending", label: "En attente" },
            { val: "Invited", label: "Invités" },
            { val: "Accepted", label: "Acceptés" },
            { val: "Rejected", label: "Refusés" },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => setStatusFilter(f.val)}
              className={`px-3 py-1.5 text-sm rounded ${
                statusFilter === f.val ? "bg-orange-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Nom</th>
                <th className="py-3 px-4">Ville</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Inscription</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Aucune invitation</td></tr>
              ) : invitations.map((i) => (
                <tr key={i.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 font-mono text-xs">{i.email}</td>
                  <td className="py-2 px-4">{i.name || "—"}</td>
                  <td className="py-2 px-4">{i.city || "—"}</td>
                  <td className="py-2 px-4 text-xs text-gray-500">{i.source}</td>
                  <td className="py-2 px-4 text-xs">{new Date(i.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 px-4">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="py-2 px-4">
                    {i.status === "Pending" && (
                      <button
                        onClick={() => updateStatus(i.id, "Invited")}
                        className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                      >
                        Marquer invité
                      </button>
                    )}
                    {i.status === "Invited" && (
                      <button
                        onClick={() => updateStatus(i.id, "Accepted")}
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      >
                        Marquer accepté
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-50",
    yellow: "text-yellow-500 bg-yellow-50",
    purple: "text-purple-500 bg-purple-50",
    green: "text-green-500 bg-green-50",
  };
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors[color]} mb-2`}>{icon}</div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Invited: "bg-purple-100 text-purple-700",
    Accepted: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || "bg-gray-100"}`}>{status}</span>;
}
