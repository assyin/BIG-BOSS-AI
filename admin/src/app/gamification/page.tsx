"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Save, RefreshCw } from "lucide-react";

const API = "http://localhost:5050";

interface Config {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  updatedAt: string;
}

const CATEGORY_TABS = ["points", "streak", "affiliation", "anticheat", "challenges"];

export default function GamificationPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("points");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchConfigs = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/gamification/config`, { headers, params: { category: activeCategory } });
      setConfigs(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConfigs(); }, [activeCategory]);

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/gamification/config/${key}`, { value: editValue }, { headers });
      setEditingKey(null);
      await fetchConfigs();
    } catch (err) { alert("Erreur de sauvegarde"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration Gamification</h1>
          <p className="text-gray-500 mt-1">Tous les parametres sont modifiables sans redeploiement</p>
        </div>
        <button onClick={fetchConfigs} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          <RefreshCw size={16} /> Rafraichir
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6">
        {CATEGORY_TABS.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${activeCategory === cat ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Config table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Cle</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Valeur</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Modifie</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {configs.map((cfg) => (
              <tr key={cfg.key} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm text-gray-800">{cfg.key}</td>
                <td className="px-6 py-4">
                  {editingKey === cfg.key ? (
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      className="border rounded px-3 py-1 w-32 text-sm" autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSave(cfg.key)} />
                  ) : (
                    <span className="font-bold text-orange-600 cursor-pointer" onClick={() => { setEditingKey(cfg.key); setEditValue(cfg.value); }}>
                      {cfg.value}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{cfg.description}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{new Date(cfg.updatedAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-6 py-4">
                  {editingKey === cfg.key && (
                    <button onClick={() => handleSave(cfg.key)} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                      <Save size={14} /> {saving ? "..." : "OK"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {configs.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-400">Aucune configuration dans cette categorie</p>
        )}
      </div>
    </div>
  );
}
