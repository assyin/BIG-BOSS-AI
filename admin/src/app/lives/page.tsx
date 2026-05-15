"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Edit, Trash2, Video } from "lucide-react";
import LiveForm from "@/components/LiveForm";

interface Live {
  id: string;
  title: string;
  description: string;
  type: number;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  viewerCount?: number;
  streamUrl?: string;
  replayUrl?: string;
  thumbnailUrl?: string;
}

const typeLabels: Record<number, string> = {
  1: "Workout",
  2: "Nutrition",
  3: "Q&A",
  4: "Challenge",
  5: "Masterclass",
};

const typeColors: Record<number, string> = {
  1: "bg-orange-100 text-orange-700",
  2: "bg-green-100 text-green-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-pink-100 text-pink-700",
};

export default function LivesPage() {
  const router = useRouter();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLive, setEditingLive] = useState<Live | null>(null);

  const fetchLives = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await axios.get("http://localhost:5050/api/lives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLives(response.data.items || response.data || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLives();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce live?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5050/api/lives/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLives();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("fr-FR");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              Lives
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Liste des lives ({lives.length})
          </h2>
          <button
            onClick={() => {
              setEditingLive(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter un live
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <LiveForm
            live={editingLive}
            onClose={() => {
              setShowForm(false);
              setEditingLive(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingLive(null);
              fetchLives();
            }}
          />
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : lives.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucun live
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez par ajouter votre premier live
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter un live
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Titre
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Planifie le
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Debut
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Fin
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Viewers
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lives.map((live) => (
                  <tr key={live.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {live.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          typeColors[live.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {typeLabels[live.type] || "Autre"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDateTime(live.scheduledAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDateTime(live.startedAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDateTime(live.endedAt)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {live.viewerCount ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingLive(live);
                          setShowForm(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 ml-2"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(live.id)}
                        className="text-red-500 hover:text-red-700 p-1 ml-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
