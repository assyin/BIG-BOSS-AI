"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

interface Recipe {
  id?: string;
  titleFr: string;
  titleAr?: string;
  title?: string;
  description?: string;
  category: number;
  mealType?: string;
  cuisineType?: string;
  difficultyLevel?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  caloriesPerServing: number;
  proteinsGPerServing: number;
  carbsGPerServing: number;
  fatsGPerServing: number;
  ingredients: string[];
  steps: string[];
  photoUrl?: string;
  videoUrl?: string;
  tags: string[];
  dietTags?: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isRamadanFriendly: boolean;
  isBulking: boolean;
  isCutting: boolean;
  isFeatured: boolean;
  titleDarija?: string;
  descriptionDarija?: string;
  ingredientsDarija?: string[];
  stepsDarija?: string[];
}

interface Props {
  recipe?: Recipe | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 1, label: "Petit-dejeuner" },
  { value: 2, label: "Dejeuner" },
  { value: 3, label: "Diner" },
  { value: 4, label: "Snack" },
  { value: 5, label: "Pre-Workout" },
  { value: 6, label: "Post-Workout" },
  { value: 7, label: "Smoothie" },
  { value: 8, label: "Dessert" },
];

const CUISINES = ["american", "mexican", "italian", "mediterranean", "indian", "asian", "middle_eastern", "international", "french", "moroccan"];
const DIFFICULTIES = ["easy", "medium", "hard"];

export default function RecipeForm({ recipe, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<Recipe>({
    titleFr: recipe?.titleFr || "",
    titleAr: recipe?.titleAr || "",
    title: recipe?.title || "",
    description: recipe?.description || "",
    category: recipe?.category || 1,
    mealType: recipe?.mealType || "",
    cuisineType: recipe?.cuisineType || "",
    difficultyLevel: recipe?.difficultyLevel || "",
    prepTimeMinutes: recipe?.prepTimeMinutes || 0,
    cookTimeMinutes: recipe?.cookTimeMinutes || 0,
    servings: recipe?.servings || 1,
    caloriesPerServing: recipe?.caloriesPerServing || 0,
    proteinsGPerServing: recipe?.proteinsGPerServing || 0,
    carbsGPerServing: recipe?.carbsGPerServing || 0,
    fatsGPerServing: recipe?.fatsGPerServing || 0,
    ingredients: recipe?.ingredients || [],
    steps: recipe?.steps || [],
    photoUrl: recipe?.photoUrl || "",
    videoUrl: recipe?.videoUrl || "",
    tags: recipe?.tags || [],
    dietTags: recipe?.dietTags || [],
    isVegetarian: recipe?.isVegetarian ?? false,
    isVegan: recipe?.isVegan ?? false,
    isGlutenFree: recipe?.isGlutenFree ?? false,
    isRamadanFriendly: recipe?.isRamadanFriendly ?? false,
    isBulking: recipe?.isBulking ?? false,
    isCutting: recipe?.isCutting ?? false,
    isFeatured: recipe?.isFeatured ?? false,
    titleDarija: recipe?.titleDarija || "",
    descriptionDarija: recipe?.descriptionDarija || "",
    ingredientsDarija: recipe?.ingredientsDarija || [],
    stepsDarija: recipe?.stepsDarija || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newIngredient, setNewIngredient] = useState("");
  const [newStep, setNewStep] = useState("");
  const [newTag, setNewTag] = useState("");
  const [contentLang, setContentLang] = useState<"fr" | "darija">("fr");
  const [newIngDarija, setNewIngDarija] = useState("");
  const [newStepDarija, setNewStepDarija] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = recipe?.id
        ? `http://localhost:5050/api/recipes/${recipe.id}`
        : "http://localhost:5050/api/recipes";

      const method = recipe?.id ? "put" : "post";

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

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, newIngredient.trim()],
      });
      setNewIngredient("");
    }
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const addStep = () => {
    if (newStep.trim()) {
      setFormData({
        ...formData,
        steps: [...formData.steps, newStep.trim()],
      });
      setNewStep("");
    }
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {recipe?.id ? "Modifier la recette" : "Nouvelle recette"}
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

          {/* Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre (Francais) *
              </label>
              <input
                type="text"
                value={formData.titleFr}
                onChange={(e) =>
                  setFormData({ ...formData, titleFr: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre (Arabe)
              </label>
              <input
                type="text"
                value={formData.titleAr}
                onChange={(e) =>
                  setFormData({ ...formData, titleAr: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Description de la recette..."
            />
          </div>

          {/* Category + Cuisine + Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categorie *
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: Number(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
            <select value={formData.cuisineType} onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option value="">-- Choisir --</option>
              {CUISINES.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulte</label>
            <select value={formData.difficultyLevel} onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option value="">-- Choisir --</option>
              {DIFFICULTIES.map((d) => (<option key={d} value={d}>{d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : 'Difficile'}</option>))}
            </select>
          </div>
          </div>

          {/* Diet Tags */}
          {formData.dietTags && formData.dietTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags Regime</label>
              <div className="flex flex-wrap gap-2">
                {formData.dietTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    {tag.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Time & Servings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temps de preparation (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.prepTimeMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, prepTimeMinutes: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temps de cuisson (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cookTimeMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, cookTimeMinutes: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portions
              </label>
              <input
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) =>
                  setFormData({ ...formData, servings: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Nutrition */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Nutrition (par portion)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Calories</label>
                <input
                  type="number"
                  min="0"
                  value={formData.caloriesPerServing}
                  onChange={(e) =>
                    setFormData({ ...formData, caloriesPerServing: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Proteines (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.proteinsGPerServing}
                  onChange={(e) =>
                    setFormData({ ...formData, proteinsGPerServing: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Glucides (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.carbsGPerServing}
                  onChange={(e) =>
                    setFormData({ ...formData, carbsGPerServing: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Lipides (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.fatsGPerServing}
                  onChange={(e) =>
                    setFormData({ ...formData, fatsGPerServing: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Language tabs for content */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { id: "fr" as const, label: "Francais", flag: "🇫🇷" },
              { id: "darija" as const, label: "Darija", flag: "🇲🇦" },
            ]).map((lang) => (
              <button key={lang.id} type="button"
                onClick={() => setContentLang(lang.id)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  contentLang === lang.id ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>

          {contentLang === "darija" && (
            <>
              {/* Darija Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre Darija 🇲🇦</label>
                  <input type="text" dir="rtl" value={formData.titleDarija}
                    onChange={(e) => setFormData({ ...formData, titleDarija: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titre Arabe</label>
                  <input type="text" dir="rtl" value={formData.titleAr}
                    onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description Darija</label>
                <textarea dir="rtl" value={formData.descriptionDarija} rows={2}
                  onChange={(e) => setFormData({ ...formData, descriptionDarija: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              </div>
              {/* Darija Ingredients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المكونات (Ingredients)</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" dir="rtl" value={newIngDarija}
                    onChange={(e) => setNewIngDarija(e.target.value)}
                    placeholder="مثلا: جوج كيسان ديال الحمص"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newIngDarija.trim()) { setFormData({...formData, ingredientsDarija: [...(formData.ingredientsDarija||[]), newIngDarija.trim()]}); setNewIngDarija(""); }}}} />
                  <button type="button" onClick={() => { if (newIngDarija.trim()) { setFormData({...formData, ingredientsDarija: [...(formData.ingredientsDarija||[]), newIngDarija.trim()]}); setNewIngDarija(""); }}}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Ajouter</button>
                </div>
                <div className="space-y-1">
                  {(formData.ingredientsDarija||[]).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg text-sm" dir="rtl">
                      <span className="flex-1">{item}</span>
                      <button type="button" onClick={() => setFormData({...formData, ingredientsDarija: formData.ingredientsDarija?.filter((_,idx) => idx !== i)})} className="text-orange-400 hover:text-orange-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Darija Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الخطوات (Etapes)</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" dir="rtl" value={newStepDarija}
                    onChange={(e) => setNewStepDarija(e.target.value)}
                    placeholder="مثلا: سخن زيت الزيتون فالطاجين"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newStepDarija.trim()) { setFormData({...formData, stepsDarija: [...(formData.stepsDarija||[]), newStepDarija.trim()]}); setNewStepDarija(""); }}}} />
                  <button type="button" onClick={() => { if (newStepDarija.trim()) { setFormData({...formData, stepsDarija: [...(formData.stepsDarija||[]), newStepDarija.trim()]}); setNewStepDarija(""); }}}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Ajouter</button>
                </div>
                <div className="space-y-1">
                  {(formData.stepsDarija||[]).map((step, i) => (
                    <div key={i} className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg text-sm" dir="rtl">
                      <span className="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{i+1}</span>
                      <span className="flex-1">{step}</span>
                      <button type="button" onClick={() => setFormData({...formData, stepsDarija: formData.stepsDarija?.filter((_,idx) => idx !== i)})} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {contentLang === "fr" && (
          <>
          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                placeholder="Ex: 200g de poulet"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addIngredient())
                }
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.ingredients.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="hover:text-orange-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etapes
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Ex: Faire chauffer l'huile dans une poele"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addStep())
                }
              />
              <button
                type="button"
                onClick={addStep}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {formData.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm"
                >
                  <span className="text-orange-500 font-medium">{i + 1}.</span>
                  <span className="flex-1 text-gray-700">{step}</span>
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          </>
          )}

          {/* Media URLs */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Medias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">URL Photo</label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, photoUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">URL Video</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ex: healthy, rapide"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Options</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "isVegetarian", label: "Vegetarien" },
                { key: "isVegan", label: "Vegan" },
                { key: "isGlutenFree", label: "Sans gluten" },
                { key: "isRamadanFriendly", label: "Ramadan friendly" },
                { key: "isBulking", label: "Prise de masse" },
                { key: "isCutting", label: "Seche" },
                { key: "isFeatured", label: "Mise en avant" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={opt.key}
                    checked={(formData as any)[opt.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [opt.key]: e.target.checked })
                    }
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <label htmlFor={opt.key} className="text-sm text-gray-700">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
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
              {loading ? "Sauvegarde..." : recipe?.id ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
