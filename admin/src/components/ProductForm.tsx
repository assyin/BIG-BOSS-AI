"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";

interface Product {
  id?: string;
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

interface Props {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 1, label: "Supplement" },
  { value: 2, label: "Equipement" },
  { value: 3, label: "Vetements" },
  { value: 4, label: "Accessoires" },
];

export default function ProductForm({ product, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<Product>({
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || 1,
    priceMad: product?.priceMad || 0,
    discountedPriceMad: product?.discountedPriceMad || undefined,
    stock: product?.stock || 0,
    imageUrls: product?.imageUrls || [],
    supplierId: product?.supplierId || "",
    commissionPercent: product?.commissionPercent || 0,
    isFeatured: product?.isFeatured ?? false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = product?.id
        ? `http://localhost:5050/api/products/${product.id}`
        : "http://localhost:5050/api/products";

      const method = product?.id ? "put" : "post";

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

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormData({
        ...formData,
        imageUrls: [...formData.imageUrls, newImageUrl.trim()],
      });
      setNewImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {product?.id ? "Modifier le produit" : "Nouveau produit"}
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
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

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix (MAD) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.priceMad}
                onChange={(e) =>
                  setFormData({ ...formData, priceMad: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix remise (MAD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discountedPriceMad || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountedPriceMad: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images (URLs)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addImageUrl())
                }
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.imageUrls.map((url, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm max-w-xs truncate"
                >
                  {url}
                  <button
                    type="button"
                    onClick={() => removeImageUrl(i)}
                    className="hover:text-orange-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Supplier & Commission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Fournisseur
              </label>
              <input
                type="text"
                value={formData.supplierId}
                onChange={(e) =>
                  setFormData({ ...formData, supplierId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionPercent}
                onChange={(e) =>
                  setFormData({ ...formData, commissionPercent: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) =>
                setFormData({ ...formData, isFeatured: e.target.checked })
              }
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="isFeatured" className="text-sm text-gray-700">
              Produit mis en avant
            </label>
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
              {loading ? "Sauvegarde..." : product?.id ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
