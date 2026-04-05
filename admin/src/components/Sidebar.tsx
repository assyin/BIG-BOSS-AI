"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  ChefHat,
  ShoppingBag,
  Trophy,
  Video,
  LogOut,
  Star,
  Gift,
  Medal,
  Users,
  Shield,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exercises", label: "Exercices", icon: Dumbbell },
  { href: "/recipes", label: "Recettes", icon: ChefHat },
  { href: "/products", label: "Produits", icon: ShoppingBag },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/lives", label: "Lives", icon: Video },
  { href: "/gamification", label: "Points & Config", icon: Star },
  { href: "/shop", label: "Boutique Points", icon: Gift },
  { href: "/achievements", label: "Badges", icon: Medal },
  { href: "/affiliation", label: "Affiliation", icon: Users },
  { href: "/anticheat", label: "Anti-Triche", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">
          <span className="text-orange-500">BB</span> Admin
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Deconnexion</span>
        </button>
      </div>
    </aside>
  );
}
