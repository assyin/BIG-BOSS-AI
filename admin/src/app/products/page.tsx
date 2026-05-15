"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Edit, Trash2, ShoppingBag, Star } from "lucide-react";
import ProductForm from "@/components/ProductForm";

interface Product {
  id: string;
  name: string;
  description: string;
  category: number;
  priceMad: number;
  discountedPriceMad?: number;
  stock: number;
  imageUrls: string[];
  supplierId?: string;
  commissionPercent: number;
  isFeatured: boolean;
}

const categoryLabels: Record<number, string> = {
  1: "Supplement",
  2: "Equipement",
  3: "Vetements",
  4: "Accessoires",
};

const categoryColors: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-purple-100 text-purple-700",
  3: "bg-pink-100 text-pink-700",
  4: "bg-green-100 text-green-700",
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await axios.get("http://localhost:5050/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.items || response.data || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5050/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
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
            <ShoppingBag className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-bold text-gray-800">
              Produits
            </h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Liste des produits ({products.length})
          </h2>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Ajouter un produit
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <ProductForm
            product={editingProduct}
            onClose={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingProduct(null);
              fetchProducts();
            }}
          />
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Aucun produit
            </h3>
            <p className="text-gray-500 mb-4">
              Commencez par ajouter votre premier produit
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter un produit
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Nom
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Categorie
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Prix MAD
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Prix Remise
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Stock
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                    Disponible
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          categoryColors[product.category] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {categoryLabels[product.category] || "Autre"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.priceMad} MAD
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.discountedPriceMad
                        ? `${product.discountedPriceMad} MAD`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.stock}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          product.stock > 0 ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {product.isFeatured && (
                        <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowForm(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 ml-2"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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
