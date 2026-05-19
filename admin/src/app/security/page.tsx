"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Info, Key } from "lucide-react";

const API = "http://localhost:5050";

interface AuditCheck {
  id: string;
  title: string;
  status: "OK" | "WARN" | "FAIL" | "INFO";
  detail: string;
}

interface AuditData {
  generatedAt: string;
  stats: { totalChecks: number; passed: number; warnings: number; failed: number };
  secrets: { key: string; configured: boolean; label: string }[];
  checks: AuditCheck[];
}

/**
 * Sprint 6.3 — Audit OWASP Top 10 + secrets check.
 */
export default function SecurityAuditPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/"); return; }
        const r = await axios.get<AuditData>(`${API}/api/admin/security/audit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(r.data);
      } catch (e: any) {
        setError(e?.response?.data?.error || "Erreur chargement audit");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement audit OWASP...</div>;
  }
  if (error || !data) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "OK": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "WARN": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "FAIL": return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case "OK": return "bg-green-50 border-green-200";
      case "WARN": return "bg-yellow-50 border-yellow-200";
      case "FAIL": return "bg-red-50 border-red-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-orange-500" /> Audit OWASP Top 10
            </h1>
            <p className="text-gray-500 mt-1">{new Date(data.generatedAt).toLocaleString("fr-FR")}</p>
          </div>
          <a href="/dashboard" className="text-sm text-orange-600 hover:underline">← Dashboard admin</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Total checks</div>
            <div className="text-3xl font-bold">{data.stats.totalChecks}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">✓ Passés</div>
            <div className="text-3xl font-bold text-green-600">{data.stats.passed}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">⚠ Warnings</div>
            <div className="text-3xl font-bold text-yellow-600">{data.stats.warnings}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">✗ Échecs</div>
            <div className="text-3xl font-bold text-red-600">{data.stats.failed}</div>
          </div>
        </div>

        {/* Secrets */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-500" /> Secrets configurés
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.secrets.map((s) => (
              <div
                key={s.key}
                className={`p-3 rounded border ${s.configured ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                <div className="text-xs font-mono">{s.key}</div>
                <div className="text-sm mt-1">{s.configured ? "✓ Configuré" : "✗ Manquant"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Checks */}
        <div className="space-y-2">
          {data.checks.map((c) => (
            <div key={c.id} className={`p-4 rounded-lg border ${statusBg(c.status)}`}>
              <div className="flex items-start gap-3">
                {statusIcon(c.status)}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    <span className="text-xs font-mono text-gray-500 mr-2">{c.id}</span>
                    {c.title}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{c.detail}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  c.status === "OK" ? "bg-green-200 text-green-800" :
                  c.status === "FAIL" ? "bg-red-200 text-red-800" :
                  c.status === "WARN" ? "bg-yellow-200 text-yellow-800" :
                  "bg-blue-200 text-blue-800"
                }`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
