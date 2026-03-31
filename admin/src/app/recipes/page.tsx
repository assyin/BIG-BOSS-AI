"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Edit, Trash2, ChefHat, Star } from "lucide-react";
import RecipeForm from "@/components/RecipeForm";

interface Recipe {
  id: string;
  titleFr: string;
  titleAr?: string;
  title?: string;
  description?: string;
  category: number;
  mealType?: string;
  cuisineType?: string;
  difficultyLevel?: string;
  totalTimeMinutes?: number;
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
}

const categoryLabels: Record<number, string> = {
  1: "Petit-dejeuner",
  2: "Dejeuner",
  3: "Diner",
  4: "Snack",
  5: "Pre-Workout",
  6: "Post-Workout",
  7: "Smoothie",
  8: "Dessert",
};

const categoryColors: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-green-100 text-green-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-red-100 text-red-700",
  7: "bg-pink-100 text-pink-700",
  8: "bg-indigo-100 text-indigo-700",
};

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await axios.get("http://localhost:5000/api/recipes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecipes(response.data.items || response.data || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette recette?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecipes();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              Recettes
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Liste des recettes ({recipes.length})
          </h2>
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter une recette
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <RecipeForm
            recipe={editingRecipe}
            onClose={() => {
              setShowForm(false);
              setEditingRecipe(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingRecipe(null);
              fetchRecipes();
            }}
          />
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : recipes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucune recette
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez par ajouter votre premiere recette
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter une recette
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
                    Categorie
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Temps total
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Calories
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Proteines
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Regime
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
                {recipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {recipe.titleFr}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          categoryColors[recipe.category] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {categoryLabels[recipe.category] || "Autre"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {recipe.totalTimeMinutes ?? (recipe.prepTimeMinutes + recipe.cookTimeMinutes) ?? 0} min
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {recipe.caloriesPerServing} kcal
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {recipe.proteinsGPerServing}g
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {recipe.isVegetarian && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Veg
                          </span>
                        )}
                        {recipe.isVegan && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Vegan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {recipe.isFeatured && (
                        <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("token");
                            const res = await axios.get(`http://localhost:5000/api/recipes/${recipe.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setEditingRecipe(res.data);
                          } catch {
                            setEditingRecipe(recipe);
                          }
                          setShowForm(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 ml-2"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
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
