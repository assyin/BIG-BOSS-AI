"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, ToggleLeft, ToggleRight, Package } from "lucide-react";

const API = "http://localhost:5050";

interface ShopReward {
  id: string;
  title: string;
  description: string;
  category: number;
  pointsCost: number;
  stock: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  isFeatured: boolean;
}

const CATEGORY_LABELS: Record<number, string> = {
  1: "Reduction", 2: "Produit", 3: "Digital", 4: "Abonnement", 5: "Experience",
};

export default function ShopPage() {
  const [rewards, setRewards] = useState<ShopReward[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchRewards = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/shop/rewards`, { headers });
      setRewards(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRewards(); }, []);

  const toggleActive = async (reward: ShopReward) => {
    await axios.put(`${API}/api/admin/shop/rewards/${reward.id}`, { ...reward, isActive: !reward.isActive }, { headers });
    fetchRewards();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Boutique de Points</h1>
          <p className="text-gray-500 mt-1">Gestion des recompenses echangeables</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Recompense</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Categorie</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Cout (pts)</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Stock</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Max/User</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Actif</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{r.title}</div>
                  <div className="text-sm text-gray-400 truncate max-w-xs">{r.description}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-sm font-medium">
                    {CATEGORY_LABELS[r.category] || "Autre"}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-orange-600">{r.pointsCost}</td>
                <td className="px-6 py-4 text-gray-600">{r.stock ?? "∞"}</td>
                <td className="px-6 py-4 text-gray-600">{r.maxPerUser ?? "∞"}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleActive(r)} className="text-gray-600 hover:text-orange-500">
                    {r.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
