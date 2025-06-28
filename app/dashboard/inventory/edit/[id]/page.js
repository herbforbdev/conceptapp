"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Label, TextInput, Select } from "flowbite-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useMasterData } from "@/hooks/useMasterData";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi";
import { useTranslation } from "@/lib/utils/localizationUtils";

export default function EditInventoryPage({ params }) {
  const router = useRouter();
  const { id } = params;
  
  // Use the shared master data hook
  const { 
    activityTypes,
    productMap,
    loading: masterDataLoading 
  } = useMasterData();

  // Get inventory data for current stock calculation
  const { data: inventoryData, loading: inventoryLoading } = useFirestoreCollection("Inventory");

  // Get current stock for a product with improved ID handling
  const getCurrentStock = useMemo(() => (productId, excludeCurrentId = null) => {
    if (!productId || !inventoryData) return 0;
    
    // Get the product details
    const product = productMap.get(productId);
    if (!product) return 0;

    console.log('Getting stock for product:', product);
    
    // Get all movements for this product - check both ID and name
    const movements = inventoryData
      .filter(m => {
        // Exclude current entry when calculating initial stock
        if (excludeCurrentId && m.id === excludeCurrentId) return false;

        // Match by either product ID or product name
        return m.productId === productId || 
               m.productId === product.productid ||
               m.productName === product.productid;
      })
      .sort((a, b) => {
        // Convert Firestore timestamps to Date objects for comparison
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

    console.log('Found movements:', movements);

    // If there are movements, return the most recent remaining quantity
    if (movements.length > 0) {
      // Get the most recent movement
      const latestMovement = movements[0];
      console.log(`Latest movement for ${product.productid}:`, latestMovement);
      return latestMovement.remainingQuantity || 0;
    }

    return 0;
  }, [inventoryData, productMap]);

  const [formData, setFormData] = useState({
    date: "",
    movementType: "",
    initialQuantity: "",
    quantityMoved: "",
    remainingQuantity: "",
    productId: "",
    productName: "",
    activityTypeId: "",
    activityTypeName: ""
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products based on selected activity type
  const filteredProducts = useMemo(() => {
    if (!formData.activityTypeId) return [];

    // Create a Map to ensure uniqueness by ID
    const uniqueProducts = new Map();
    
    Array.from(productMap.values())
      .filter(product => {
        // Basic validation
        if (!product || !product.producttype) return false;
        
        // Match activity ID - Trim whitespace from both IDs
        const matchesActivity = (product.activitytypeid || '').trim() === formData.activityTypeId.trim();
        
        // Check product type - CASE SENSITIVE MATCH
        const productType = product.producttype;
        const isMainProduct = 
          productType === 'Block Ice' || 
          productType === 'Cube Ice' ||
          productType === 'Water Bottling';
        
        // Exclude packaging - CASE SENSITIVE MATCH
        const isNotPackaging = 
          !productType?.includes('Packaging') &&
          !product.productid?.includes('Package');

        return matchesActivity && isMainProduct && isNotPackaging;
      })
      .forEach(product => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });

    // Debug logging
    console.log("Filtered products for activity:", formData.activityTypeId, Array.from(uniqueProducts.values()));

    return Array.from(uniqueProducts.values())
      .sort((a, b) => (a.productid || '').localeCompare(b.productid || ''));
  }, [productMap, formData.activityTypeId]);

  // Fetch inventory record
  useEffect(() => {
    async function fetchInventory() {
      try {
        const docRef = doc(firestore, "Inventory", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Get current stock excluding this entry
          const currentStock = getCurrentStock(data.productId, id);
          console.log('Current stock excluding this entry:', currentStock);

          setFormData({
            date: data.date ? new Date(data.date.seconds * 1000).toISOString().split("T")[0] : "",
            movementType: data.movementType || "",
            initialQuantity: currentStock,
            quantityMoved: data.quantityMoved || "",
            remainingQuantity: data.remainingQuantity || "",
            productId: data.productId || "",
            productName: data.productName || "",
            activityTypeId: data.activityTypeId || "",
            activityTypeName: data.activityTypeName || ""
          });
        } else {
          setError("Inventory record not found");
        }
      } catch (err) {
        console.error("Error fetching inventory record:", err);
        setError("Failed to fetch inventory record");
      } finally {
        setLoading(false);
      }
    }
    
    if (!masterDataLoading && !inventoryLoading) {
      fetchInventory();
    }
  }, [id, masterDataLoading, inventoryLoading, getCurrentStock]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // Recalculate remaining quantity when any relevant field changes
      if (['movementType', 'initialQuantity', 'quantityMoved'].includes(name)) {
        const initialQty = Number(updated.initialQuantity) || 0;
        const movedQty = Number(updated.quantityMoved) || 0;
        
        if (updated.movementType === "OPENING") {
          updated.remainingQuantity = movedQty; // Opening stock = quantity moved
        } else if (updated.movementType === "IN") {
          updated.remainingQuantity = initialQty + movedQty;
        } else if (updated.movementType === "OUT") {
          updated.remainingQuantity = initialQty - movedQty;
        } else if (updated.movementType === "ADJUSTMENT") {
          updated.remainingQuantity = movedQty;
        }
      }

      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate form
    if (!formData.date) {
      setError("Please select a date");
      return;
    }
    if (!formData.movementType) {
      setError("Please select a movement type");
      return;
    }
    if (!formData.productId) {
      setError("Please select a product");
      return;
    }
    if (!formData.activityTypeId) {
      setError("Please select an activity type");
      return;
    }
    if (!formData.quantityMoved || formData.quantityMoved <= 0) {
      setError("Quantity moved must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const docRef = doc(firestore, "Inventory", id);
      await updateDoc(docRef, {
        date: new Date(formData.date),
        movementType: formData.movementType,
        initialQuantity: Number(formData.initialQuantity),
        quantityMoved: Number(formData.quantityMoved),
        remainingQuantity: Number(formData.remainingQuantity),
        productId: formData.productId,
        productName: formData.productName,
        activityTypeId: formData.activityTypeId,
        activityTypeName: formData.activityTypeName,
        modifiedAt: serverTimestamp()
      });

      router.push("/dashboard/inventory");
    } catch (err) {
      console.error("Error updating inventory record:", err);
      setError("Failed to update inventory record");
      setIsSubmitting(false);
    }
  };

  const { t } = useTranslation();

  if (loading || masterDataLoading || inventoryLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error && !inventoryData) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
          <Link 
            href="/dashboard/inventory"
            className="text-purple-600 hover:underline"
          >
            {t('inventory.actions.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link 
              href="/dashboard/inventory"
              className="mr-4 p-2 hover:bg-purple-50 rounded-full transition-colors text-purple-600"
            >
              <HiArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-purple-900">{t('inventory.edit.title')}</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        <Card className="mb-6 bg-white border border-purple-100 shadow-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Field */}
              <div>
                <Label htmlFor="date" value={t('inventory.table.date')} />
                <TextInput
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityTypeId" value={t('inventory.filters.activityType')} />
                <Select
                  id="activityTypeId"
                  name="activityTypeId"
                  value={formData.activityTypeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('inventory.filters.allActivityTypes')}</option>
                  {activityTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Product */}
              <div>
                <Label htmlFor="productId" value={t('inventory.table.product')} />
                <Select
                  id="productId"
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  required
                  disabled={!formData.activityTypeId}
                >
                  <option value="">{t('inventory.add.selectProduct')}</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productid}
                    </option>
                  ))}
                </Select>
                {filteredProducts.length === 0 && formData.activityTypeId && (
                  <p className="mt-1 text-sm text-gray-500">
                    {t('inventory.add.noProducts')}
                  </p>
                )}
              </div>

              {/* Current Stock */}
              <div>
                <Label htmlFor="initialQuantity" value={t('inventory.add.currentStock')} />
                <div className="relative">
                  <TextInput
                    id="initialQuantity"
                    name="initialQuantity"
                    type="number"
                    value={formData.initialQuantity}
                    readOnly
                    className="bg-gray-50"
                  />
                  {formData.productId && (
                    <div className="mt-1 text-sm text-gray-500">
                      {t('inventory.edit.currentStock')} {productMap.get(formData.productId)?.productid || 'selected product'}
                    </div>
                  )}
                </div>
              </div>

              {/* Movement Type */}
              <div>
                <Label htmlFor="movementType" value={t('inventory.table.movementType')} />
                <Select
                  id="movementType"
                  name="movementType"
                  value={formData.movementType}
                  onChange={handleChange}
                  required
                  disabled={!formData.productId}
                >
                  <option value="">{t('inventory.table.selectMovementType')}</option>
                  <option value="OPENING">{t('inventory.table.opening', 'Opening Stock')}</option>
                  <option value="IN">{t('inventory.table.stockIn')}</option>
                  <option value="OUT">{t('inventory.table.stockOut')}</option>
                  <option value="ADJUSTMENT">{t('inventory.table.adjustment')}</option>
                </Select>
              </div>

              {/* Quantity Moved */}
              <div>
                <Label htmlFor="quantityMoved" value={t('inventory.table.quantityMoved')} />
                <TextInput
                  id="quantityMoved"
                  name="quantityMoved"
                  type="number"
                  value={formData.quantityMoved}
                  onChange={handleChange}
                  required
                  disabled={!formData.movementType}
                  min={formData.movementType === "OUT" ? 0 : undefined}
                  max={formData.movementType === "OUT" ? formData.initialQuantity : undefined}
                />
                {formData.movementType === "OUT" && (
                  <div className="mt-1 text-sm text-gray-500">
                    {t('inventory.edit.maxQuantity', { value: formData.initialQuantity })}
                  </div>
                )}
              </div>

              {/* Remaining Quantity */}
              <div>
                <Label htmlFor="remainingQuantity" value={t('inventory.table.remaining')} />
                <TextInput
                  id="remainingQuantity"
                  name="remainingQuantity"
                  type="number"
                  value={formData.remainingQuantity}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                color="light"
                onClick={() => router.push("/dashboard/inventory")}
                className="bg-purple-50 text-purple-600 hover:bg-purple-100"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
