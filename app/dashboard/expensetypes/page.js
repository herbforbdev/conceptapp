"use client";

import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { firestore } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ExpenseTypesPage() {
  const { data: expenseTypes, loading, error } = useFirestoreCollection("ExpenseTypes");
  const router = useRouter();

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this expense type?")) {
      try {
        await deleteDoc(doc(firestore, "ExpenseTypes", id));
        alert("Expense type deleted successfully.");
        router.refresh();
      } catch (err) {
        console.error("Error deleting expense type:", err);
        alert("Failed to delete expense type.");
      }
    }
  };

  if (loading) return <p>Loading expense types...</p>;
  if (error) return <p>Error loading expense types.</p>;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Expense Types Maintenance</h1>
      <Link href="/expensetypes/add">
        <button className="mb-4 bg-blue-500 text-white px-4 py-2 rounded">
          Add New Expense Type
        </button>
      </Link>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="py-2 border">Type</th>
            <th className="py-2 border">Description</th>
            <th className="py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenseTypes.map((et) => (
            <tr key={et.id}>
              <td className="py-2 border text-center">{et.type}</td>
              <td className="py-2 border">{et.description}</td>
              <td className="py-2 border text-center">
                <Link href={`/expensetypes/edit/${et.id}`}>
                  <button className="bg-green-500 text-white px-2 py-1 rounded mr-2">
                    Edit
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(et.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
