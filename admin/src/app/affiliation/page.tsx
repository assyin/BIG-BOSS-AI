"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Users, TrendingUp, Star } from "lucide-react";

const API = "http://localhost:5050";

export default function AffiliationPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/api/affiliation/stats`, { headers });
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Programme d'Affiliation</h1>
        <p className="text-gray-500 mt-1">Suivi des parrainages et commissions</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-blue-500" />
            <span className="text-sm text-gray-500">Total parraines</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalReferrals || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={20} className="text-green-500" />
            <span className="text-sm text-gray-500">Actifs</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.activeReferrals || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Star size={20} className="text-yellow-500" />
            <span className="text-sm text-gray-500">Points gagnes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalPointsEarned || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <Star size={20} className="text-orange-500" />
            <span className="text-sm text-gray-500">En attente</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.pendingPoints || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Code de parrainage</h2>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold tracking-widest text-orange-500">{stats?.referralCode || "..."}</span>
          <button onClick={() => navigator.clipboard.writeText(stats?.referralCode || "")}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
            Copier
          </button>
        </div>
      </div>
    </div>
  );
}
