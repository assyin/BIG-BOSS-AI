"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Edit, Trash2, Trophy, Star } from "lucide-react";
import ChallengeForm from "@/components/ChallengeForm";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: number;
  metricName: string;
  metricUnit: string;
  startDate: string;
  endDate: string;
  rewardDescription?: string;
  rewardImageUrl?: string;
  imageUrl?: string;
  isFeatured: boolean;
}

const typeLabels: Record<number, string> = {
  1: "Volume",
  2: "Consistance",
  3: "Force",
  4: "Transformation",
};

const typeColors: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-red-100 text-red-700",
  4: "bg-purple-100 text-purple-700",
};

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await axios.get("http://localhost:5000/api/challenges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChallenges(response.data.items || response.data || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce challenge?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/challenges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChallenges();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const isActive = (start: string, end: string) => {
    const now = new Date();
    return new Date(start) <= now && now <= new Date(end);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR");
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
            <Trophy className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              Challenges
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Liste des challenges ({challenges.length})
          </h2>
          <button
            onClick={() => {
              setEditingChallenge(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter un challenge
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <ChallengeForm
            challenge={editingChallenge}
            onClose={() => {
              setShowForm(false);
              setEditingChallenge(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingChallenge(null);
              fetchChallenges();
            }}
          />
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucun challenge
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez par ajouter votre premier challenge
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter un challenge
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
                    Metrique
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Date debut
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Date fin
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Actif
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Featured
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {challenge.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          typeColors[challenge.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {typeLabels[challenge.type] || "Autre"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {challenge.metricName} ({challenge.metricUnit})
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(challenge.startDate)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(challenge.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          isActive(challenge.startDate, challenge.endDate)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {challenge.isFeatured && (
                        <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingChallenge(challenge);
                          setShowForm(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 ml-2"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(challenge.id)}
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
