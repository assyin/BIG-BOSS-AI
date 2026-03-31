"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import axios from "axios";

interface Exercise {
  id?: string;
  nameFr: string;
  nameEn?: string;
  nameAr?: string;
  nameDarija?: string;
  descriptionFr?: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  difficulty: string;
  requiredEquipment: string;
  videoDemoUrl?: string;
  thumbnailUrl?: string;
  instructionsEn?: string[];
  instructionsFr?: string[];
  tipsEn?: string[];
  tipsCoachFr?: string[];
  erreursCourantesFr?: string[];
  coachingCues?: string[];
  commonMistakes?: string[];
  isActive: boolean;
}

interface Props {
  exercise?: Exercise | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MUSCLE_GROUPS = [
  { value: "Chest", label: "Pectoraux" },
  { value: "Back", label: "Dos" },
  { value: "Quadriceps", label: "Quadriceps" },
  { value: "Hamstrings", label: "Ischio-jambiers" },
  { value: "Glutes", label: "Fessiers" },
  { value: "Calves", label: "Mollets" },
  { value: "Shoulders", label: "Epaules" },
  { value: "Biceps", label: "Biceps" },
  { value: "Triceps", label: "Triceps" },
  { value: "Abs", label: "Abdominaux" },
  { value: "Bodyweight", label: "Full Body" },
  { value: "Cardio", label: "Cardio" },
  { value: "Mobility", label: "Mobilite" },
];

const DIFFICULTIES = [
  { value: "Beginner", label: "Debutant" },
  { value: "Intermediate", label: "Intermediaire" },
  { value: "Advanced", label: "Avance" },
];

const EQUIPMENT = [
  { value: "None", label: "Aucun" },
  { value: "Barbell", label: "Barre" },
  { value: "Dumbbell", label: "Halteres" },
  { value: "Cable", label: "Cable" },
  { value: "Machine", label: "Machine" },
  { value: "Bodyweight", label: "Poids du corps" },
  { value: "Kettlebell", label: "Kettlebell" },
  { value: "ResistanceBand", label: "Elastique" },
  { value: "PullUpBar", label: "Barre de traction" },
  { value: "Bench", label: "Banc" },
];

function ArrayField({
  label,
  items,
  color,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  color: string;
  placeholder: string;
  onAdd: (val: string) => void;
  onRemove: (i: number) => void;
}) {
  const [value, setValue] = useState("");
  const colorClasses: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.trim()) { onAdd(value.trim()); setValue(""); }
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(""); } }}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm ${colorClasses[color]}`}>
              <span className="flex-1">{item}</span>
              <button type="button" onClick={() => onRemove(i)} className="mt-0.5 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExerciseForm({ exercise, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<Exercise>({
    nameFr: exercise?.nameFr || "",
    nameEn: exercise?.nameEn || "",
    nameAr: exercise?.nameAr || "",
    nameDarija: exercise?.nameDarija || "",
    descriptionFr: exercise?.descriptionFr || "",
    primaryMuscle: exercise?.primaryMuscle || "Chest",
    secondaryMuscles: exercise?.secondaryMuscles || [],
    difficulty: exercise?.difficulty || "Intermediate",
    requiredEquipment: exercise?.requiredEquipment || "Bodyweight",
    videoDemoUrl: exercise?.videoDemoUrl || "",
    thumbnailUrl: exercise?.thumbnailUrl || "",
    instructionsEn: exercise?.instructionsEn || [],
    instructionsFr: exercise?.instructionsFr || [],
    tipsEn: exercise?.tipsEn || [],
    tipsCoachFr: exercise?.tipsCoachFr || [],
    erreursCourantesFr: exercise?.erreursCourantesFr || [],
    coachingCues: exercise?.coachingCues || [],
    commonMistakes: exercise?.commonMistakes || [],
    isActive: exercise?.isActive ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "content" | "media">("general");
  const [contentLang, setContentLang] = useState<"fr" | "en" | "ar">("fr");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = exercise?.id
        ? `http://localhost:5000/api/exercises/${exercise.id}`
        : "http://localhost:5000/api/exercises";
      const method = exercise?.id ? "put" : "post";

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

  const updateArray = (field: keyof Exercise, action: "add" | "remove", value?: string, index?: number) => {
    const arr = [...((formData[field] as string[]) || [])];
    if (action === "add" && value) arr.push(value);
    if (action === "remove" && index !== undefined) arr.splice(index, 1);
    setFormData({ ...formData, [field]: arr });
  };

  const tabs = [
    { id: "general" as const, label: "General" },
    { id: "content" as const, label: "Contenu" },
    { id: "media" as const, label: "Media" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {exercise?.id ? "Modifier l'exercice" : "Nouvel exercice"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* TAB: General */}
          {activeTab === "general" && (
            <>
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom (Francais) *</label>
                  <input type="text" value={formData.nameFr}
                    onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom (Anglais)</label>
                  <input type="text" value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Muscle principal *</label>
                  <select value={formData.primaryMuscle}
                    onChange={(e) => setFormData({ ...formData, primaryMuscle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    {MUSCLE_GROUPS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulte *</label>
                  <select value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    {DIFFICULTIES.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipement *</label>
                  <select value={formData.requiredEquipment}
                    onChange={(e) => setFormData({ ...formData, requiredEquipment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    {EQUIPMENT.map((e) => (<option key={e.value} value={e.value}>{e.label}</option>))}
                  </select>
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Exercice actif</label>
              </div>
            </>
          )}

          {/* TAB: Content */}
          {activeTab === "content" && (
            <div className="space-y-5">
              {/* Language sub-tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {([
                  { id: "fr" as const, label: "Francais", flag: "🇫🇷" },
                  { id: "en" as const, label: "English", flag: "🇬🇧" },
                  { id: "ar" as const, label: "Arabe / Darija", flag: "🇲🇦" },
                ]).map((lang) => (
                  <button key={lang.id} type="button"
                    onClick={() => setContentLang(lang.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      contentLang === lang.id
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>

              {/* FR Content */}
              {contentLang === "fr" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={formData.descriptionFr} rows={3}
                      onChange={(e) => setFormData({ ...formData, descriptionFr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm" />
                  </div>

                  <ArrayField label="Instructions" items={formData.instructionsFr || []}
                    color="blue" placeholder="Etape d'execution..."
                    onAdd={(v) => updateArray("instructionsFr", "add", v)}
                    onRemove={(i) => updateArray("instructionsFr", "remove", undefined, i)} />

                  <ArrayField label="Tips Coach" items={formData.tipsCoachFr || []}
                    color="green" placeholder="Conseil du coach..."
                    onAdd={(v) => updateArray("tipsCoachFr", "add", v)}
                    onRemove={(i) => updateArray("tipsCoachFr", "remove", undefined, i)} />

                  <ArrayField label="Erreurs courantes" items={formData.erreursCourantesFr || []}
                    color="red" placeholder="Erreur a eviter..."
                    onAdd={(v) => updateArray("erreursCourantesFr", "add", v)}
                    onRemove={(i) => updateArray("erreursCourantesFr", "remove", undefined, i)} />

                  <ArrayField label="Points de coaching" items={formData.coachingCues || []}
                    color="orange" placeholder="Point de coaching..."
                    onAdd={(v) => updateArray("coachingCues", "add", v)}
                    onRemove={(i) => updateArray("coachingCues", "remove", undefined, i)} />
                </div>
              )}

              {/* EN Content */}
              {contentLang === "en" && (
                <div className="space-y-5">
                  <ArrayField label="Instructions" items={formData.instructionsEn || []}
                    color="blue" placeholder="Execution step..."
                    onAdd={(v) => updateArray("instructionsEn", "add", v)}
                    onRemove={(i) => updateArray("instructionsEn", "remove", undefined, i)} />

                  <ArrayField label="Tips" items={formData.tipsEn || []}
                    color="green" placeholder="Coach tip..."
                    onAdd={(v) => updateArray("tipsEn", "add", v)}
                    onRemove={(i) => updateArray("tipsEn", "remove", undefined, i)} />

                  <ArrayField label="Common Mistakes" items={formData.commonMistakes || []}
                    color="red" placeholder="Common mistake..."
                    onAdd={(v) => updateArray("commonMistakes", "add", v)}
                    onRemove={(i) => updateArray("commonMistakes", "remove", undefined, i)} />
                </div>
              )}

              {/* AR/Darija Content */}
              {contentLang === "ar" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom Darija</label>
                    <input type="text" dir="rtl" value={formData.nameDarija}
                      onChange={(e) => setFormData({ ...formData, nameDarija: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom Arabe</label>
                    <input type="text" dir="rtl" value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                  </div>
                  <p className="text-sm text-gray-400 italic">Les instructions et tips en Darija/Arabe seront ajoutes dans une prochaine version.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Media */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Video Demo</label>
                <input type="url" value={formData.videoDemoUrl}
                  onChange={(e) => setFormData({ ...formData, videoDemoUrl: e.target.value })}
                  placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              {formData.videoDemoUrl && (
                <video src={formData.videoDemoUrl} controls className="w-full rounded-lg max-h-64 bg-black" />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Thumbnail</label>
                <input type="url" value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              {formData.thumbnailUrl && (
                <img src={formData.thumbnailUrl} alt="Thumbnail" className="w-32 h-32 object-cover rounded-lg" />
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50">
              {loading ? "Sauvegarde..." : exercise?.id ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
