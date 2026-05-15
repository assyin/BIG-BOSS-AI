"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Users,
  Dumbbell,
  ChefHat,
  ShoppingBag,
  Trophy,
  Video,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  users: number;
  exercises: number;
  recipes: number;
  products: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    users: 0,
    exercises: 0,
    recipes: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [exercisesRes, recipesRes, productsRes] = await Promise.allSettled([
          axios.get("http://localhost:5050/api/exercises", { headers }),
          axios.get("http://localhost:5050/api/recipes", { headers }),
          axios.get("http://localhost:5050/api/products", { headers }),
        ]);

        setStats({
          users: 0,
          exercises:
            exercisesRes.status === "fulfilled"
              ? (exercisesRes.value.data.items || exercisesRes.value.data || []).length
              : 0,
          recipes:
            recipesRes.status === "fulfilled"
              ? (recipesRes.value.data.items || recipesRes.value.data || []).length
              : 0,
          products:
            productsRes.status === "fulfilled"
              ? (productsRes.value.data.items || productsRes.value.data || []).length
              : 0,
        });
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Utilisateurs",
      value: stats.users,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Exercices",
      value: stats.exercises,
      icon: Dumbbell,
      color: "bg-orange-500",
    },
    {
      label: "Recettes",
      value: stats.recipes,
      icon: ChefHat,
      color: "bg-green-500",
    },
    {
      label: "Produits",
      value: stats.products,
      icon: ShoppingBag,
      color: "bg-purple-500",
    },
  ];

  const quickActions = [
    { label: "Ajouter exercice", href: "/exercises", icon: Dumbbell },
    { label: "Ajouter recette", href: "/recipes", icon: ChefHat },
    { label: "Ajouter produit", href: "/products", icon: ShoppingBag },
    { label: "Ajouter challenge", href: "/challenges", icon: Trophy },
    { label: "Ajouter live", href: "/lives", icon: Video },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4"
              >
                <div
                  className={`${card.color} p-3 rounded-lg`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? "..." : card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Actions rapides
          </h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Activite recente
          </h2>
          <div className="text-gray-500 text-sm py-8 text-center">
            Les dernieres activites apparaitront ici.
          </div>
        </div>
      </main>
    </div>
  );
}
