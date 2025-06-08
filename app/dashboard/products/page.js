"use client";

import { useState, useEffect } from "react";
import { useFirestoreCollection } from "../../../hooks/useFirestoreCollection";
import { firestore } from "@/lib/firebase";
import { deleteDoc, doc, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "flowbite-react";
import { HiPencil, HiTrash, HiRefresh, HiPlus } from "react-icons/hi";

export default function ProductsPage() {
  const { data: products, loading, error } = useFirestoreCollection("Products");
  const { data: activityTypes } = useFirestoreCollection("ActivityTypes");
  const router = useRouter();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  
  // Filter state
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState("");
  
  // Selection state for multi-delete
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Apply filters when data or filter terms change
  useEffect(() => {
    if (!products) return;
    
    let filtered = [...products];
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.productid?.toLowerCase().includes(term) || 
        p.description?.toLowerCase().includes(term)
      );
    }
    
    // Apply product type filter
    if (selectedProductType) {
      filtered = filtered.filter(p => p.producttype === selectedProductType);
    }
    
    // Apply activity type filter
    if (selectedActivityType) {
      filtered = filtered.filter(p => p.activitytypeid === selectedActivityType);
    }
    
    setFilteredProducts(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    // Clear selections when filters change
    setSelectedItems([]);
    setSelectAll(false);
  }, [products, searchTerm, selectedProductType, selectedActivityType]);
  
  // Toggle select all items
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      // If we're checking the box, select all current entries
      setSelectedItems(currentEntries.map(item => item.id));
    } else {
      // If we're unchecking, clear selections
      setSelectedItems([]);
    }
  };
  
  // Toggle a single item selection
  const toggleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    } else {
      setSelectedItems(prev => [...prev, id]);
    }
  };
  
  // Reset selections when page changes
  useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
  }, [currentPage]);
  
  // Handle bulk delete of selected items
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      const batch = writeBatch(firestore);
      
      selectedItems.forEach(id => {
        const docRef = doc(firestore, "Products", id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      
      // Reset selections
      setSelectedItems([]);
      setSelectAll(false);
      
      // Refresh the data
      router.refresh();
    } catch (err) {
      console.error("Error bulk deleting products:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete a product without confirmation
  const handleDelete = async (productId) => {
    try {
      await deleteDoc(doc(firestore, "Products", productId));
      router.refresh();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    router.refresh();
  };
  
  // Get activity type name from ID
  const getActivityTypeName = (id) => {
    const activityType = activityTypes?.find(a => a.id === id);
    return activityType ? activityType.name : id || "None";
  };
  
  // Get paginated data
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredProducts.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredProducts.length / entriesPerPage);
  
  // Pagination controls
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  
  // Collect unique product types for filter dropdown
  const productTypes = products ? [...new Set(products.map(p => p.producttype).filter(Boolean))] : [];

  if (loading) return (
          <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading products...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-red-100 text-red-700 p-4 rounded-lg">
        <p>Error loading products: {error.message}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Products Maintenance</h1>
        
        {/* Filters and Actions */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Search Products
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {/* Product Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Product Type
              </label>
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Product Types</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Activity Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Activity Type
              </label>
              <select
                value={selectedActivityType}
                onChange={(e) => setSelectedActivityType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Activity Types</option>
                {activityTypes?.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        
        {/* Products Table */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Product List</h2>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:bg-gray-400 flex items-center gap-1"
                >
                  <HiTrash className="h-4 w-4" /> 
                  Delete Selected ({selectedItems.length})
                </button>
              )}
              <button 
                onClick={() => router.push("/dashboard/products/add")}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                <HiPlus className="h-4 w-4" /> Add New Product
              </button>
              <button 
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                onClick={handleRefresh}
              >
                <HiRefresh className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product ID</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity Type</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEntries.length > 0 ? (
                  currentEntries.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(prod.id)}
                            onChange={() => toggleSelectItem(prod.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{prod.productid}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{prod.producttype || "—"}</td>
                      <td className="px-3 py-4 text-sm text-gray-900">{prod.description || "—"}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{getActivityTypeName(prod.activitytypeid)}</td>
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/products/edit/${prod.id}`)}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                            title="Edit"
                          >
                            <HiPencil className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(prod.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                            title="Delete"
                          >
                            <HiTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Improved Pagination */}
          {filteredProducts.length > entriesPerPage && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
              <div>
                <span className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstEntry + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(indexOfLastEntry, filteredProducts.length)}</span> of{" "}
                  <span className="font-medium">{filteredProducts.length}</span> entries
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 text-sm rounded border ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    // If 5 or fewer pages, show all
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    // If near start, show first 5 pages
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    // If near end, show last 5 pages
                    pageNum = totalPages - 4 + i;
                  } else {
                    // Otherwise, show current page and 2 before/after
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`px-3 py-1 text-sm rounded border ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 text-sm rounded border ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
