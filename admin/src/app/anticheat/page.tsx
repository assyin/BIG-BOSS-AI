"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Shield, AlertTriangle, CheckCircle, Ban, UserX } from "lucide-react";

const API = "http://localhost:5050";

interface FlaggedUser {
  userId: string;
  userName: string;
  email: string;
  flags: { reason: string; source: string; createdAt: string }[];
  suspicionScore: number;
  isSuspended: boolean;
}

export default function AntiCheatPage() {
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/gamification/anticheat/flagged`, { headers });
      setFlaggedUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleResolve = async (userId: string, resolution: string) => {
    setResolving(userId);
    try {
      await axios.post(`${API}/api/admin/gamification/anticheat/resolve`, { userId, resolution }, { headers });
      await fetchData();
    } catch (err) { alert("Erreur"); }
    finally { setResolving(null); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-50";
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anti-Triche</h1>
          <p className="text-gray-500 mt-1">{flaggedUsers.length} utilisateurs flagges</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
          Rafraichir
        </button>
      </div>

      {flaggedUsers.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Shield size={48} className="mx-auto text-green-400 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Tout est propre!</h3>
          <p className="text-gray-400 mt-2">Aucun utilisateur suspect detecte</p>
        </div>
      )}

      <div className="space-y-4">
        {flaggedUsers.map((user) => (
          <div key={user.userId} className={`bg-white rounded-xl shadow-sm border p-6 ${user.isSuspended ? "border-red-200 bg-red-50" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-600">{user.userName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.userName}</h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                {user.isSuspended && (
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">SUSPENDU</span>
                )}
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getScoreColor(user.suspicionScore)}`}>
                {user.suspicionScore}/100
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-2 mb-4">
              {user.flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
                  <span className="text-gray-700">{flag.reason}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-400">{flag.source}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-400">{new Date(flag.createdAt).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            {!user.isSuspended && (
              <div className="flex gap-3">
                <button onClick={() => handleResolve(user.userId, "innocent")}
                  disabled={resolving === user.userId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium">
                  <CheckCircle size={16} /> Innocenter
                </button>
                <button onClick={() => handleResolve(user.userId, "disqualify")}
                  disabled={resolving === user.userId}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-sm font-medium">
                  <UserX size={16} /> Disqualifier
                </button>
                <button onClick={() => { if (confirm("Bannir cet utilisateur ?")) handleResolve(user.userId, "ban"); }}
                  disabled={resolving === user.userId}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                  <Ban size={16} /> Bannir
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
