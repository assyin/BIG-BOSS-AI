"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Users, TrendingUp, Crown, Activity, Video, Flame,
  ChefHat, MapPin, Calendar, DollarSign,
} from "lucide-react";

interface AnalyticsKpi {
  totalUsers: number;
  dau: number;
  mau: number;
  premiumUsers: number;
  conversionRate: number;
  newUsersLast30: number;
  growthRate: number;
  monthRevenue: number;
  sessionsLast30: number;
  livesUpcoming: number;
  livesLast30: number;
}

interface AnalyticsData {
  generatedAt: string;
  kpi: AnalyticsKpi;
  growthCurve: { date: string; count: number }[];
  topRecipes: { recipeId: string; title: string; favoriteCount: number }[];
  topChallenges: { id: string; title: string; participants: number }[];
  cityHeatmap: { city: string; count: number }[];
}

const API = "http://localhost:5050";

/**
 * Sprint 5.4 — Dashboard influenceur.
 * Vue d'ensemble business pour le propriétaire de BBF.
 */
export default function InfluencerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/"); return; }
        const res = await axios.get<AnalyticsData>(`${API}/api/admin/influencer-analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.error || "Erreur chargement analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement du dashboard influenceur...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error || "Pas de données"}</div>
      </div>
    );
  }

  const { kpi, growthCurve, topRecipes, topChallenges, cityHeatmap } = data;

  // Calc max for growth curve sparkline
  const maxGrowth = Math.max(1, ...growthCurve.map((g) => g.count));
  const maxCity = Math.max(1, ...cityHeatmap.map((c) => c.count));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Dashboard Influenceur</h1>
            <p className="text-gray-500 mt-1">
              Vue d'ensemble Big Boss Fitness — {new Date(data.generatedAt).toLocaleString("fr-FR")}
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-orange-600 hover:underline"
          >
            ← Dashboard admin
          </a>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<Users className="w-6 h-6" />}
            label="Utilisateurs"
            value={kpi.totalUsers.toLocaleString("fr-FR")}
            sub={`+${kpi.newUsersLast30} en 30j`}
            color="blue"
          />
          <KpiCard
            icon={<Activity className="w-6 h-6" />}
            label="DAU / MAU"
            value={`${kpi.dau} / ${kpi.mau}`}
            sub={`${kpi.mau > 0 ? Math.round((kpi.dau * 100) / kpi.mau) : 0}% stickiness`}
            color="green"
          />
          <KpiCard
            icon={<Crown className="w-6 h-6" />}
            label="Premium"
            value={`${kpi.premiumUsers} (${kpi.conversionRate}%)`}
            sub="Conversion Free→Premium"
            color="yellow"
          />
          <KpiCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Revenus 30j"
            value={`${kpi.monthRevenue.toLocaleString("fr-FR")} MAD`}
            sub="Payments succès"
            color="green"
          />
          <KpiCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Croissance"
            value={`${kpi.growthRate >= 0 ? "+" : ""}${kpi.growthRate}%`}
            sub="vs 30j précédents"
            color={kpi.growthRate >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={<Flame className="w-6 h-6" />}
            label="Séances 30j"
            value={kpi.sessionsLast30.toLocaleString("fr-FR")}
            sub="Sessions complétées"
            color="orange"
          />
          <KpiCard
            icon={<Video className="w-6 h-6" />}
            label="Lives à venir"
            value={`${kpi.livesUpcoming}`}
            sub={`${kpi.livesLast30} lives sur 30j`}
            color="purple"
          />
          <KpiCard
            icon={<Calendar className="w-6 h-6" />}
            label="Heatmap users"
            value={`${cityHeatmap.length} villes`}
            sub={cityHeatmap[0]?.city ? `Top: ${cityHeatmap[0].city}` : ""}
            color="indigo"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Growth Curve */}
          <Card title="📈 Croissance 30 jours (nouveaux users / jour)">
            {growthCurve.length === 0 ? (
              <p className="text-gray-500">Pas de données</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {growthCurve.map((d) => {
                  const h = (d.count * 100) / maxGrowth;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 bg-orange-500 rounded-t hover:bg-orange-600 transition"
                      style={{ height: `${h}%`, minHeight: 2 }}
                      title={`${new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}: ${d.count}`}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* City Heatmap */}
          <Card title="🇲🇦 Top villes Maroc">
            {cityHeatmap.length === 0 ? (
              <p className="text-gray-500">Pas de données</p>
            ) : (
              <ul className="space-y-2">
                {cityHeatmap.map((c) => (
                  <li key={c.city} className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="w-24 font-medium">{c.city}</span>
                    <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full"
                        style={{ width: `${(c.count * 100) / maxCity}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Top contenus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="🍽️ Top 10 recettes favorites">
            {topRecipes.length === 0 ? (
              <p className="text-gray-500">Aucune favorite</p>
            ) : (
              <ol className="space-y-2">
                {topRecipes.map((r, i) => (
                  <li key={r.recipeId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="flex items-center gap-3">
                      <ChefHat className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">{i + 1}. {r.title}</span>
                    </span>
                    <span className="text-sm text-gray-500">{r.favoriteCount} ♡</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="🏆 Top challenges">
            {(topChallenges as any[]).length === 0 ? (
              <p className="text-gray-500">Aucun challenge actif</p>
            ) : (
              <ol className="space-y-2">
                {(topChallenges as any[]).map((c: any, i: number) => (
                  <li key={c.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="font-medium">{i + 1}. {c.title}</span>
                    <span className="text-sm text-gray-500">{c.participants} participants</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: "blue" | "green" | "yellow" | "red" | "orange" | "purple" | "indigo";
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-50",
    green: "text-green-500 bg-green-50",
    yellow: "text-yellow-500 bg-yellow-50",
    red: "text-red-500 bg-red-50",
    orange: "text-orange-500 bg-orange-50",
    purple: "text-purple-500 bg-purple-50",
    indigo: "text-indigo-500 bg-indigo-50",
  };
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colorMap[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
