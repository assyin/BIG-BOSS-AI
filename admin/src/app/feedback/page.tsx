"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { MessageSquare, Bug, Lightbulb, Heart, Star } from "lucide-react";

const API = "http://localhost:5050";

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  category: "bug" | "feature" | "general" | "praise";
  content: string;
  screenshotUrl?: string | null;
  appVersion?: string | null;
  deviceInfo?: string | null;
  status: "Open" | "InProgress" | "Resolved" | "Dismissed";
  adminResponse?: string | null;
  createdAt: string;
  respondedAt?: string | null;
}

/**
 * Sprint 6.5 — Admin feedback inbox.
 */
export default function FeedbackAdminPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState({ status: "", category: "" });
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/"); return; }
      const params: any = {};
      if (filter.status) params.status = filter.status;
      if (filter.category) params.category = filter.category;
      const [r, s] = await Promise.all([
        axios.get(`${API}/api/feedback/admin/list`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }),
        axios.get(`${API}/api/feedback/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setFeedbacks(r.data.feedbacks || []);
      setStats({ ...r.data, ...s.data });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: string) => {
    if (!responseText.trim()) {
      alert("Tape une réponse");
      return;
    }
    const token = localStorage.getItem("token");
    await axios.post(`${API}/api/feedback/admin/${id}/respond`, {
      response: responseText,
      newStatus: status,
    }, { headers: { Authorization: `Bearer ${token}` } });
    setResponding(null);
    setResponseText("");
    await load();
  };

  const catIcon = (c: string) => {
    switch (c) {
      case "bug": return <Bug className="w-4 h-4 text-red-500" />;
      case "feature": return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case "praise": return <Heart className="w-4 h-4 text-pink-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-orange-500" /> Feedback inbox
            </h1>
            <p className="text-gray-500 mt-1">
              {stats?.total || 0} feedbacks · Moyenne {stats?.averageRating || 0}/5 ⭐
            </p>
          </div>
          <a href="/dashboard" className="text-sm text-orange-600 hover:underline">← Dashboard</a>
        </div>

        {/* Stats by category */}
        {stats?.byCategory && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stats.byCategory.map((c: any) => (
              <div key={c.category} className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
                {catIcon(c.category)}
                <div>
                  <div className="text-xs text-gray-500 uppercase">{c.category}</div>
                  <div className="text-2xl font-bold">{c.count}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded text-sm bg-white"
          >
            <option value="">Tous status</option>
            <option value="Open">Open</option>
            <option value="InProgress">En cours</option>
            <option value="Resolved">Résolus</option>
            <option value="Dismissed">Ignorés</option>
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded text-sm bg-white"
          >
            <option value="">Toutes catégories</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="general">Général</option>
            <option value="praise">Compliment</option>
          </select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {feedbacks.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
              Aucun feedback pour ces filtres
            </div>
          ) : feedbacks.map((f) => (
            <div key={f.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div>{catIcon(f.category)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold">{f.userName}</span>
                    <span className="text-xs text-gray-400">{f.userEmail}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3 h-3 ${n <= f.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      f.status === "Open" ? "bg-orange-100 text-orange-700" :
                      f.status === "InProgress" ? "bg-blue-100 text-blue-700" :
                      f.status === "Resolved" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{f.status}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-2 whitespace-pre-wrap">{f.content}</p>

                  {f.adminResponse && (
                    <div className="mt-2 p-3 bg-orange-50 rounded border-l-4 border-orange-400">
                      <div className="text-xs text-orange-600 font-semibold mb-1">Réponse admin · {f.respondedAt && new Date(f.respondedAt).toLocaleDateString("fr-FR")}</div>
                      <p className="text-sm">{f.adminResponse}</p>
                    </div>
                  )}

                  {responding === f.id ? (
                    <div className="mt-3">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Ta réponse..."
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => respond(f.id, "Resolved")} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                          Résolu
                        </button>
                        <button onClick={() => respond(f.id, "InProgress")} className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                          En cours
                        </button>
                        <button onClick={() => respond(f.id, "Dismissed")} className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500">
                          Ignorer
                        </button>
                        <button onClick={() => { setResponding(null); setResponseText(""); }} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : !f.adminResponse && (
                    <button
                      onClick={() => { setResponding(f.id); setResponseText(""); }}
                      className="mt-2 px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                    >
                      Répondre
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
