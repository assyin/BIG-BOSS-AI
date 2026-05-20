"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5050";

/**
 * Sprint 6.5 — Landing page publique d'inscription beta.
 * Accessible sans auth — utilisé dans email marketing / réseaux sociaux.
 */
export default function BetaSignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<{ total: number; target: number } | null>(null);

  useEffect(() => {
    axios.get(`${API}/api/beta/stats`).then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      alert("Email invalide");
      return;
    }
    setSubmitting(true);
    try {
      const r = await axios.post(`${API}/api/beta/signup`, { email, name, city });
      setResult(r.data);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">{result.alreadyRegistered ? "👍" : "🎉"}</div>
          <h1 className="text-2xl font-bold mb-3">
            {result.alreadyRegistered ? "Tu es déjà dans la liste !" : "Bienvenue dans la beta !"}
          </h1>
          <p className="text-gray-600 mb-4">{result.message}</p>
          {result.position && (
            <div className="bg-orange-100 text-orange-700 rounded-lg p-3 mb-4">
              Position : <strong>#{result.position}</strong> / {stats?.target ?? 500}
            </div>
          )}
          <p className="text-sm text-gray-500">
            On t'envoie un email avec ton invitation TestFlight d'ici quelques jours.
            Suis-nous sur Instagram pour les news 🇲🇦
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-br from-orange-500 to-red-600 text-white text-3xl font-bold w-20 h-20 rounded-2xl flex items-center justify-center mb-3 mx-auto">
            BB
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Big Boss Fitness 🇲🇦</h1>
          <p className="text-gray-500 mt-1">L'app fitness marocaine — Beta privée</p>
        </div>

        {/* Counter */}
        {stats && (
          <div className="bg-orange-100 rounded-lg p-3 mb-6 text-center">
            <div className="text-sm text-orange-700">Inscrits actuellement</div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.total} / {stats.target}
            </div>
            <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${Math.min(100, (stats.total * 100) / stats.target)}%` }}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yassine"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            >
              {["Casablanca", "Marrakech", "Rabat", "Tanger", "Fès", "Agadir", "Autre"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 rounded-lg shadow-lg hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50"
          >
            {submitting ? "Inscription..." : "🚀 Je veux la beta"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Free pendant la beta · TestFlight (iOS) / Play Beta (Android)
        </p>
      </div>
    </div>
  );
}
