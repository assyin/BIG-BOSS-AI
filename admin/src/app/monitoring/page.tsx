"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Cpu, Database, AlertTriangle, ShieldX, ShieldCheck, Trash2, Brain } from "lucide-react";

const API = "http://localhost:5050";

/**
 * Sprint 6.1 — Admin tech dashboard:
 * System health + Moderation queue + User management + AI cost.
 */
export default function MonitoringPage() {
  const router = useRouter();
  const [health, setHealth] = useState<any>(null);
  const [moderation, setModeration] = useState<any>(null);
  const [aiCost, setAiCost] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/"); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const [h, m, c, u] = await Promise.allSettled([
        axios.get(`${API}/api/admin/tech/system-health`, { headers }),
        axios.get(`${API}/api/admin/tech/moderation-queue`, { headers }),
        axios.get(`${API}/api/admin/tech/ai-cost`, { headers }),
        axios.get(`${API}/api/admin/tech/users?page=1&pageSize=20`, { headers }),
      ]);
      if (h.status === "fulfilled") setHealth(h.value.data);
      if (m.status === "fulfilled") setModeration(m.value.data);
      if (c.status === "fulfilled") setAiCost(c.value.data);
      if (u.status === "fulfilled") setUsers(u.value.data.users || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleApprovePost = async (postId: string) => {
    const token = localStorage.getItem("token");
    await axios.post(`${API}/api/admin/tech/posts/${postId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAll();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Supprimer ce post définitivement ?")) return;
    const token = localStorage.getItem("token");
    await axios.delete(`${API}/api/admin/tech/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAll();
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    const reason = suspend ? prompt("Raison de la suspension ?") : null;
    if (suspend && !reason) return;
    const token = localStorage.getItem("token");
    await axios.post(`${API}/api/admin/tech/users/${userId}/suspend`, { suspend, reason }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAll();
  };

  const handleSearch = async () => {
    const token = localStorage.getItem("token");
    const r = await axios.get(`${API}/api/admin/tech/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: searchQ, page: 1, pageSize: 20 },
    });
    setUsers(r.data.users || []);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement monitoring...</div>;
  }

  const totalFlagged = (moderation?.posts?.length || 0) + (moderation?.comments?.length || 0) + (moderation?.chatMessages?.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛠 Monitoring tech</h1>
            <p className="text-gray-500 mt-1">Auto-refresh 30s · {new Date().toLocaleString("fr-FR")}</p>
          </div>
          <a href="/dashboard" className="text-sm text-orange-600 hover:underline">← Dashboard admin</a>
        </div>

        {/* System health */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-500">Uptime</span>
            </div>
            <div className="text-2xl font-bold">{health?.uptime ?? "—"}</div>
            <div className="text-xs text-gray-400 mt-1">Démarré : {health?.startedAt ? new Date(health.startedAt).toLocaleString("fr-FR") : "—"}</div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-500">Mémoire</span>
            </div>
            <div className="text-2xl font-bold">{health?.workingSetMb ?? "—"} MB</div>
            <div className="text-xs text-gray-400 mt-1">Managed : {health?.managedMemoryMb} MB · Threads : {health?.threadCount}</div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Database className={`w-5 h-5 ${health?.db?.ok ? "text-green-500" : "text-red-500"}`} />
              <span className="text-sm text-gray-500">Base de données</span>
            </div>
            <div className="text-2xl font-bold">{health?.db?.ok ? "✓ Connectée" : "❌ KO"}</div>
            <div className="text-xs text-gray-400 mt-1">Latence : {health?.db?.latencyMs} ms</div>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className={`w-5 h-5 ${totalFlagged > 0 ? "text-orange-500" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500">Modération</span>
            </div>
            <div className="text-2xl font-bold">{totalFlagged}</div>
            <div className="text-xs text-gray-400 mt-1">{moderation?.posts?.length || 0} posts · {moderation?.comments?.length || 0} comments · {moderation?.chatMessages?.length || 0} chat</div>
          </Card>
        </div>

        {/* AI Cost */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" /> Coût IA Claude
            </h2>
            <span className="text-xs text-gray-400">{aiCost?.note}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Messages 30j</div>
              <div className="text-xl font-bold">{aiCost?.claude?.messagesLast30d?.toLocaleString("fr-FR") || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Messages 24h</div>
              <div className="text-xl font-bold">{aiCost?.claude?.messagesLast24h?.toLocaleString("fr-FR") || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Coût 30j</div>
              <div className="text-xl font-bold text-green-600">${aiCost?.claude?.estimatedCostUsdLast30d || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Coût 24h</div>
              <div className="text-xl font-bold text-green-600">${aiCost?.claude?.estimatedCostUsdLast24h || 0}</div>
            </div>
          </div>
        </Card>

        {/* Moderation queue */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">🚨 Queue modération</h2>
          {totalFlagged === 0 ? (
            <p className="text-gray-500">Tout est clean ✓</p>
          ) : (
            <div className="space-y-3">
              {moderation?.posts?.map((p: any) => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded border border-orange-200">
                  <span className="px-2 py-1 bg-orange-200 rounded text-xs font-bold">POST</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{p.userName}</div>
                    <div className="text-sm text-gray-700">"{p.content}"</div>
                    <div className="text-xs text-orange-600 mt-1">⚠ {p.flagReason}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprovePost(p.id)} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">Approuver</button>
                    <button onClick={() => handleDeletePost(p.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Supprimer</button>
                  </div>
                </div>
              ))}
              {moderation?.comments?.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <span className="px-2 py-1 bg-yellow-200 rounded text-xs font-bold">COMMENT</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{c.userName}</div>
                    <div className="text-sm text-gray-700">"{c.content}"</div>
                  </div>
                </div>
              ))}
              {moderation?.chatMessages?.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-red-50 rounded border border-red-200">
                  <span className="px-2 py-1 bg-red-200 rounded text-xs font-bold">LIVE CHAT</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.userName}</div>
                    <div className="text-sm text-gray-700">"{m.content}"</div>
                    <div className="text-xs text-red-600 mt-1">Toxicity: {m.toxicityScore?.toFixed?.(2)} {m.isHidden && "(auto-hidden)"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Users */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">👥 Utilisateurs</h2>
            <div className="flex gap-2">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Recherche email / nom..."
                className="px-3 py-2 border border-gray-200 rounded text-sm"
              />
              <button onClick={handleSearch} className="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">Search</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Email</th>
                <th className="py-2">Nom</th>
                <th className="py-2">Tier</th>
                <th className="py-2">Streak</th>
                <th className="py-2">Dernière activité</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className={`border-b hover:bg-gray-50 ${u.isSuspended ? "bg-red-50" : ""}`}>
                  <td className="py-2 font-mono text-xs">{u.email}</td>
                  <td className="py-2">{u.name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.subscriptionTier === 0 ? "bg-gray-200" : "bg-yellow-200"}`}>
                      {["Free", "Premium", "Pro"][u.subscriptionTier] || u.subscriptionTier}
                    </span>
                  </td>
                  <td className="py-2">{u.currentStreak}</td>
                  <td className="py-2 text-xs text-gray-500">{u.lastActivityDate ? new Date(u.lastActivityDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="py-2">
                    {u.isSuspended ? (
                      <span className="text-red-500 text-xs">SUSPENDU</span>
                    ) : (
                      <span className="text-green-500 text-xs">Actif</span>
                    )}
                  </td>
                  <td className="py-2">
                    {u.isSuspended ? (
                      <button
                        onClick={() => handleSuspend(u.id, false)}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" /> Réactiver
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(u.id, true)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center gap-1"
                      >
                        <ShieldX className="w-3 h-3" /> Suspendre
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>{children}</div>;
}
