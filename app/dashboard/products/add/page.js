"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export default function AddProduct() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productid: "",
    producttype: "",
    description: "",
    activitytypeid: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        createdAt: serverTimestamp(),
        modifiedAt: serverTimestamp()
      };
      await addDoc(collection(firestore, "Products"), payload);
      router.push("/products");
    } catch (err) {
      console.error("Error adding product:", err);
      setError("Failed to add product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="productid">
            Product ID
          </label>
          <input
            type="text"
            id="productid"
            name="productid"
            value={formData.productid}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="producttype">
            Product Type
          </label>
          <select
            id="producttype"
            name="producttype"
            value={formData.producttype}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Product Type</option>
            <option value="Ice Block">Ice Block</option>
            <option value="Bottles">Bottles</option>
            <option value="Ice cubes">Ice cubes</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="description">
            Description
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" htmlFor="activitytypeid">
            Activity Type
          </label>
          <select
            id="activitytypeid"
            name="activitytypeid"
            value={formData.activitytypeid}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Activity Type</option>
            <option value="Block Ice">Block Ice</option>
            <option value="Cubes and Bottles">Cubes and Bottles</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
        >
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}
