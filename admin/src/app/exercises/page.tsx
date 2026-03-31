"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Edit, Trash2, Dumbbell, Play, X, Search, Filter, ChevronDown, ChevronRight, LayoutGrid, List } from "lucide-react";
import ExerciseForm from "@/components/ExerciseForm";

interface Exercise {
  id: string;
  nameFr: string;
  nameEn?: string;
  nameDarija?: string;
  primaryMuscle: string;
  difficulty: string;
  requiredEquipment: string;
  isActive: boolean;
  hasVideo: boolean;
  videoDemoUrl?: string;
  thumbnailUrl?: string;
}

const MUSCLE_GROUPS: Record<string, { label: string; emoji: string; color: string }> = {
  Chest: { label: "Pectoraux", emoji: "💪", color: "bg-red-500" },
  Back: { label: "Dos", emoji: "🔙", color: "bg-blue-500" },
  Quadriceps: { label: "Quadriceps", emoji: "🦵", color: "bg-green-500" },
  Hamstrings: { label: "Ischio-jambiers", emoji: "🦿", color: "bg-green-600" },
  Glutes: { label: "Fessiers", emoji: "🍑", color: "bg-pink-500" },
  Calves: { label: "Mollets", emoji: "🦶", color: "bg-green-400" },
  Shoulders: { label: "Epaules", emoji: "🏋️", color: "bg-purple-500" },
  Biceps: { label: "Biceps", emoji: "💪", color: "bg-orange-500" },
  Triceps: { label: "Triceps", emoji: "💪", color: "bg-orange-600" },
  Abs: { label: "Abdominaux", emoji: "🧱", color: "bg-yellow-500" },
  Bodyweight: { label: "Full Body", emoji: "🏃", color: "bg-indigo-500" },
  Cardio: { label: "Cardio", emoji: "❤️", color: "bg-rose-500" },
  Mobility: { label: "Mobilite", emoji: "🧘", color: "bg-teal-500" },
};

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  Beginner: { label: "Debutant", color: "bg-green-100 text-green-700" },
  Intermediate: { label: "Intermediaire", color: "bg-yellow-100 text-yellow-700" },
  Advanced: { label: "Avance", color: "bg-red-100 text-red-700" },
};

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [videoPreview, setVideoPreview] = useState<{ name: string; url: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMuscle, setFilterMuscle] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterHasVideo, setFilterHasVideo] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/"); return; }

      let allExercises: Exercise[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await axios.get(`http://localhost:5000/api/exercises?PageSize=100&Page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = response.data.items || response.data || [];
        allExercises = [...allExercises, ...items];
        totalPages = Math.ceil((response.data.totalCount || items.length) / 100);
        page++;
      } while (page <= totalPages);

      const unique = Array.from(new Map(allExercises.map((e) => [e.id, e])).values());
      setExercises(unique);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExercises(); }, []);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((e) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.nameFr.toLowerCase().includes(q) &&
            !(e.nameEn || "").toLowerCase().includes(q) &&
            !(e.nameDarija || "").toLowerCase().includes(q)) return false;
      }
      if (filterMuscle !== "all" && e.primaryMuscle !== filterMuscle) return false;
      if (filterDifficulty !== "all" && e.difficulty !== filterDifficulty) return false;
      if (filterHasVideo === "yes" && !e.hasVideo) return false;
      if (filterHasVideo === "no" && e.hasVideo) return false;
      return true;
    });
  }, [exercises, searchQuery, filterMuscle, filterDifficulty, filterHasVideo]);

  // Grouped by muscle
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const e of filteredExercises) {
      if (!groups[e.primaryMuscle]) groups[e.primaryMuscle] = [];
      groups[e.primaryMuscle].push(e);
    }
    // Sort groups by count desc
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredExercises]);

  const toggleGroup = (muscle: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle); else next.add(muscle);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet exercice?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/exercises/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchExercises();
    } catch (err) { console.error("Erreur:", err); }
  };

  const handleEdit = async (exercise: Exercise) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/exercises/${exercise.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data;
      setEditingExercise({
        id: d.id, nameFr: d.nameFr, nameEn: d.nameEn, nameAr: d.nameAr,
        nameDarija: d.nameDarija, descriptionFr: d.descriptionFr,
        primaryMuscle: d.primaryMuscle, difficulty: d.difficulty,
        requiredEquipment: d.requiredEquipment?.[0] || exercise.requiredEquipment,
        videoDemoUrl: d.videos?.demoUrl || exercise.videoDemoUrl,
        thumbnailUrl: d.videos?.thumbnailUrl || exercise.thumbnailUrl,
        instructionsFr: d.instructionsFr || [], instructionsEn: d.instructionsEn || [],
        tipsEn: d.tipsEn || [], tipsCoachFr: d.tipsCoachFr || [],
        erreursCourantesFr: d.erreursCourantesFr || [],
        coachingCues: d.coachingCues || [], commonMistakes: d.commonMistakes || [],
        isActive: d.isActive ?? true,
      } as any);
      setShowForm(true);
    } catch {
      setEditingExercise(exercise);
      setShowForm(true);
    }
  };

  const activeFiltersCount = [
    filterMuscle !== "all" ? 1 : 0,
    filterDifficulty !== "all" ? 1 : 0,
    filterHasVideo !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterMuscle("all");
    setFilterDifficulty("all");
    setFilterHasVideo("all");
  };

  const ExerciseRow = ({ exercise }: { exercise: Exercise }) => (
    <tr key={exercise.id} className="hover:bg-gray-50 group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {exercise.thumbnailUrl ? (
            <img src={exercise.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-800 text-sm">{exercise.nameFr}</div>
            {exercise.nameEn && <div className="text-xs text-gray-400">{exercise.nameEn}</div>}
            {exercise.nameDarija && exercise.nameDarija !== exercise.nameFr && (
              <div className="text-xs text-orange-400" dir="rtl">{exercise.nameDarija}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTIES[exercise.difficulty]?.color || "bg-gray-100 text-gray-600"}`}>
          {DIFFICULTIES[exercise.difficulty]?.label || exercise.difficulty}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{exercise.requiredEquipment}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {exercise.hasVideo && <span className="w-2 h-2 rounded-full bg-green-500" title="Video disponible" />}
          {exercise.isActive ? (
            <span className="text-xs text-green-600">Actif</span>
          ) : (
            <span className="text-xs text-gray-400">Inactif</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {exercise.videoDemoUrl && (
            <button onClick={() => setVideoPreview({ name: exercise.nameFr, url: exercise.videoDemoUrl! })}
              className="text-green-500 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50" title="Video">
              <Play className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => handleEdit(exercise)}
            className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50" title="Modifier">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(exercise.id)}
            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Exercices</h1>
              <p className="text-sm text-gray-500">{filteredExercises.length} sur {exercises.length} exercices</p>
            </div>
          </div>
          <button onClick={() => { setEditingExercise(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-5 h-5" /> Ajouter
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom (FR, EN, Darija)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm" />
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? "bg-orange-50 border-orange-200 text-orange-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              <Filter className="w-4 h-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("grouped")}
                className={`p-2 ${viewMode === "grouped" ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                title="Vue groupee">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                title="Vue liste">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Groupe musculaire</label>
                <select value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500">
                  <option value="all">Tous les muscles</option>
                  {Object.entries(MUSCLE_GROUPS).map(([key, { label, emoji }]) => (
                    <option key={key} value={key}>{emoji} {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Difficulte</label>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500">
                  <option value="all">Toutes</option>
                  {Object.entries(DIFFICULTIES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Video</label>
                <select value={filterHasVideo} onChange={(e) => setFilterHasVideo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500">
                  <option value="all">Tous</option>
                  <option value="yes">Avec video</option>
                  <option value="no">Sans video</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Reinitialiser
                </button>
              </div>
            </div>
          )}

          {/* Muscle chips quick filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setFilterMuscle("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterMuscle === "all" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              Tous ({exercises.length})
            </button>
            {Object.entries(MUSCLE_GROUPS).map(([key, { label, emoji }]) => {
              const count = exercises.filter((e) => e.primaryMuscle === key).length;
              if (count === 0) return null;
              return (
                <button key={key} onClick={() => setFilterMuscle(filterMuscle === key ? "all" : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterMuscle === key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {emoji} {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <ExerciseForm exercise={editingExercise}
            onClose={() => { setShowForm(false); setEditingExercise(null); }}
            onSuccess={() => { setShowForm(false); setEditingExercise(null); fetchExercises(); }} />
        )}

        {/* Video Preview Modal */}
        {videoPreview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">{videoPreview.name}</h3>
                <button onClick={() => setVideoPreview(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <video src={videoPreview.url} controls autoPlay className="w-full rounded-lg" style={{ maxHeight: "70vh" }} />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : filteredExercises.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun exercice trouve</h3>
            <p className="text-gray-500 mb-4">Modifiez vos filtres ou ajoutez un exercice</p>
            <button onClick={clearFilters}
              className="text-orange-500 hover:text-orange-600 text-sm font-medium">
              Reinitialiser les filtres
            </button>
          </div>
        ) : viewMode === "grouped" ? (
          /* GROUPED VIEW */
          <div className="space-y-4">
            {groupedExercises.map(([muscle, muscleExercises]) => {
              const info = MUSCLE_GROUPS[muscle] || { label: muscle, emoji: "💪", color: "bg-gray-500" };
              const isCollapsed = collapsedGroups.has(muscle);

              return (
                <div key={muscle} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Group Header */}
                  <button onClick={() => toggleGroup(muscle)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${info.color} rounded-xl flex items-center justify-center text-white text-lg`}>
                        {info.emoji}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800">{info.label}</h3>
                        <p className="text-xs text-gray-400">{muscleExercises.length} exercice{muscleExercises.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Difficulty breakdown */}
                      <div className="hidden md:flex items-center gap-2">
                        {Object.entries(DIFFICULTIES).map(([key, { label, color }]) => {
                          const c = muscleExercises.filter((e) => e.difficulty === key).length;
                          return c > 0 ? (
                            <span key={key} className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                              {c} {label}
                            </span>
                          ) : null;
                        })}
                      </div>
                      {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Group Table */}
                  {!isCollapsed && (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Nom</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Niveau</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Equipement</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Statut</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {muscleExercises.map((exercise) => (
                          <ExerciseRow key={exercise.id} exercise={exercise} />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Muscle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Niveau</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Equipement</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExercises.map((exercise) => (
                  <tr key={exercise.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {exercise.thumbnailUrl ? (
                          <img src={exercise.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{exercise.nameFr}</div>
                          {exercise.nameEn && <div className="text-xs text-gray-400">{exercise.nameEn}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{MUSCLE_GROUPS[exercise.primaryMuscle]?.emoji} {MUSCLE_GROUPS[exercise.primaryMuscle]?.label || exercise.primaryMuscle}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTIES[exercise.difficulty]?.color}`}>
                        {DIFFICULTIES[exercise.difficulty]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{exercise.requiredEquipment}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {exercise.hasVideo && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        <span className={`text-xs ${exercise.isActive ? "text-green-600" : "text-gray-400"}`}>
                          {exercise.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {exercise.videoDemoUrl && (
                          <button onClick={() => setVideoPreview({ name: exercise.nameFr, url: exercise.videoDemoUrl! })}
                            className="text-green-500 hover:text-green-700 p-1.5 rounded-lg hover:bg-green-50"><Play className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleEdit(exercise)}
                          className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(exercise.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
