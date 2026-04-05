"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Medal, ToggleLeft, ToggleRight } from "lucide-react";

const API = "http://localhost:5050";

interface Achievement {
  id: string;
  key: string;
  title: string;
  titleAr: string | null;
  description: string;
  category: number;
  triggerType: string;
  triggerValue: number;
  pointsReward: number;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<number, string> = {
  1: "Regularite", 2: "Force", 3: "Volume", 4: "Social", 5: "Milestone", 6: "Nutrition",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      // Use user endpoint since admin CRUD not yet implemented
      const res = await axios.get(`${API}/api/achievements`, { headers });
      setAchievements(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Badges & Achievements</h1>
          <p className="text-gray-500 mt-1">{achievements.length} badges configures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a: any) => (
          <div key={a.id} className={`bg-white rounded-xl shadow-sm border p-6 ${!a.isActive && !a.isUnlocked ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${a.isUnlocked ? "bg-yellow-100" : "bg-gray-100"}`}>
                <Medal size={24} className={a.isUnlocked ? "text-yellow-500" : "text-gray-400"} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{a.title}</h3>
                {a.titleAr && <p className="text-sm text-gray-400">{a.titleAr}</p>}
              </div>
              <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-bold">
                +{a.pointsReward} pts
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">{a.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="bg-gray-100 px-2 py-1 rounded">{CATEGORY_LABELS[a.category] || "Autre"}</span>
              <span>{a.triggerType}: {a.triggerValue}</span>
            </div>
            {a.progress !== undefined && (
              <div className="mt-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(a.progress, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{a.currentValue}/{a.targetValue}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
