"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Send, BarChart3 } from "lucide-react";
import { API_URL, getAuthHeaders } from "@/lib/api";

interface NotificationTemplate {
  id: string;
  triggerKey: string;
  titleFr: string;
  titleAr: string | null;
  bodyFr: string;
  bodyAr: string | null;
  isActive: boolean;
  withCoachVoice: boolean;
  totalSent: number;
  openRate: number;
  createdAt: string;
  updatedAt: string;
}

const emptyTemplate: Partial<NotificationTemplate> = {
  triggerKey: "",
  titleFr: "",
  titleAr: "",
  bodyFr: "",
  bodyAr: "",
  isActive: true,
  withCoachVoice: false,
};

const TRIGGER_SUGGESTIONS = [
  "achievement_unlocked",
  "streak_risk",
  "session_reminder",
  "challenge_new",
  "challenge_completed",
  "live_starting",
  "reward_confirmed",
  "reward_shipped",
  "points_milestone",
  "weekly_recap",
];

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<NotificationTemplate>>(emptyTemplate);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/notifications/templates`, {
        headers: getAuthHeaders(),
      });
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditing(emptyTemplate);
    setModalOpen(true);
  };

  const openEdit = (t: NotificationTemplate) => {
    setEditing(t);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing.triggerKey || !editing.titleFr || !editing.bodyFr) {
      alert("Cle trigger, titre FR et corps FR sont requis");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await axios.put(`${API_URL}/api/admin/notifications/templates/${editing.id}`, editing, {
          headers: getAuthHeaders(),
        });
      } else {
        await axios.post(`${API_URL}/api/admin/notifications/templates`, editing, {
          headers: getAuthHeaders(),
        });
      }
      await fetchTemplates();
      setModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: NotificationTemplate) => {
    await axios.put(
      `${API_URL}/api/admin/notifications/templates/${t.id}`,
      { ...t, isActive: !t.isActive },
      { headers: getAuthHeaders() }
    );
    fetchTemplates();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications Push</h1>
          <p className="text-gray-500 mt-1">
            Templates FR/AR pour push notifications
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
        >
          <Plus size={18} />
          Nouveau template
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="text-sm text-gray-500">Templates actifs</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {templates.filter((t) => t.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="text-sm text-gray-500">Notifs envoyees (total)</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {templates.reduce((sum, t) => sum + (t.totalSent || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="text-sm text-gray-500">Open rate moyen</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {templates.length > 0
              ? (templates.reduce((s, t) => s + (t.openRate || 0), 0) / templates.length).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Trigger</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">FR</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">AR</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Envoyes</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Actif</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <code className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                      {t.triggerKey}
                    </code>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-semibold text-sm text-gray-900 truncate">{t.titleFr}</div>
                    <div className="text-xs text-gray-500 truncate">{t.bodyFr}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs" dir="rtl">
                    <div className="font-semibold text-sm text-gray-900 truncate">{t.titleAr || "—"}</div>
                    <div className="text-xs text-gray-500 truncate">{t.bodyAr || "—"}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.totalSent || 0}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(t)}>
                      {t.isActive ? (
                        <ToggleRight size={24} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Aucun template. Clique "Nouveau template" pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Variable helper */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <div className="font-semibold text-blue-900 mb-2">Variables disponibles</div>
        <div className="text-blue-700">
          Utilise <code className="bg-blue-100 px-1.5 rounded">{`{variable}`}</code> dans tes
          messages. Exemples: <code className="bg-blue-100 px-1.5 rounded">{`{name}`}</code>,{" "}
          <code className="bg-blue-100 px-1.5 rounded">{`{points}`}</code>,{" "}
          <code className="bg-blue-100 px-1.5 rounded">{`{days}`}</code>,{" "}
          <code className="bg-blue-100 px-1.5 rounded">{`{title}`}</code>.
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editing.id ? "Modifier le template" : "Nouveau template"}
              </h2>
              <button onClick={() => setModalOpen(false)}>
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cle trigger *
                </label>
                <input
                  type="text"
                  value={editing.triggerKey || ""}
                  onChange={(e) => setEditing({ ...editing, triggerKey: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  placeholder="ex: achievement_unlocked"
                  list="trigger-suggestions"
                  disabled={!!editing.id}
                />
                <datalist id="trigger-suggestions">
                  {TRIGGER_SUGGESTIONS.map((key) => (
                    <option key={key} value={key} />
                  ))}
                </datalist>
                {editing.id && (
                  <p className="text-xs text-gray-500 mt-1">La cle ne peut pas etre modifiee</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">🇫🇷 Francais *</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editing.titleFr || ""}
                    onChange={(e) => setEditing({ ...editing, titleFr: e.target.value })}
                    placeholder="Titre FR"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <textarea
                    value={editing.bodyFr || ""}
                    onChange={(e) => setEditing({ ...editing, bodyFr: e.target.value })}
                    placeholder="Corps FR (utilise {variable} pour les placeholders)"
                    className="w-full border rounded-lg px-3 py-2 h-20"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">🇲🇦 Arabe / Darija</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editing.titleAr || ""}
                    onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
                    placeholder="العنوان"
                    dir="rtl"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <textarea
                    value={editing.bodyAr || ""}
                    onChange={(e) => setEditing({ ...editing, bodyAr: e.target.value })}
                    placeholder="المحتوى"
                    dir="rtl"
                    className="w-full border rounded-lg px-3 py-2 h-20"
                  />
                </div>
              </div>

              <div className="border-t pt-4 flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.isActive ?? true}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.withCoachVoice ?? false}
                    onChange={(e) => setEditing({ ...editing, withCoachVoice: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Voix coach</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-orange-300"
              >
                {saving ? "..." : editing.id ? "Enregistrer" : "Creer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
