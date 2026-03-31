"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

interface Challenge {
  id?: string;
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

interface Props {
  challenge?: Challenge | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES = [
  { value: 1, label: "Volume" },
  { value: 2, label: "Consistance" },
  { value: 3, label: "Force" },
  { value: 4, label: "Transformation" },
];

export default function ChallengeForm({ challenge, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<Challenge>({
    title: challenge?.title || "",
    description: challenge?.description || "",
    type: challenge?.type || 1,
    metricName: challenge?.metricName || "",
    metricUnit: challenge?.metricUnit || "",
    startDate: challenge?.startDate ? challenge.startDate.split("T")[0] : "",
    endDate: challenge?.endDate ? challenge.endDate.split("T")[0] : "",
    rewardDescription: challenge?.rewardDescription || "",
    rewardImageUrl: challenge?.rewardImageUrl || "",
    imageUrl: challenge?.imageUrl || "",
    isFeatured: challenge?.isFeatured ?? false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = challenge?.id
        ? `http://localhost:5000/api/challenges/${challenge.id}`
        : "http://localhost:5000/api/challenges";

      const method = challenge?.id ? "put" : "post";

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {challenge?.id ? "Modifier le challenge" : "Nouveau challenge"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la metrique *
              </label>
              <input
                type="text"
                value={formData.metricName}
                onChange={(e) =>
                  setFormData({ ...formData, metricName: e.target.value })
                }
                placeholder="Ex: Repetitions, Distance"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unite de la metrique *
              </label>
              <input
                type="text"
                value={formData.metricUnit}
                onChange={(e) =>
                  setFormData({ ...formData, metricUnit: e.target.value })
                }
                placeholder="Ex: reps, km, kg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de debut *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Reward */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Recompense</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Description de la recompense
              </label>
              <input
                type="text"
                value={formData.rewardDescription}
                onChange={(e) =>
                  setFormData({ ...formData, rewardDescription: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                URL Image recompense
              </label>
              <input
                type="url"
                value={formData.rewardImageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, rewardImageUrl: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Image du challenge
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) =>
                setFormData({ ...formData, isFeatured: e.target.checked })
              }
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="isFeatured" className="text-sm text-gray-700">
              Challenge mis en avant
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Sauvegarde..." : challenge?.id ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
