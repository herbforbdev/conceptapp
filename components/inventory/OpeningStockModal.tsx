import React, { useState, useCallback } from 'react';
import { Card, Button, TextInput, Select, Label, Modal } from 'flowbite-react';
import { HiX, HiCheck, HiInformationCircle } from 'react-icons/hi';
import { inventoryService } from '@/services/firestore/inventoryService';
import { useMasterData } from '@/hooks/useMasterData';
import { useLanguage } from '@/context/LanguageContext';

interface OpeningStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedProduct?: string;
}

export default function OpeningStockModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preSelectedProduct 
}: OpeningStockModalProps) {
  const { t } = useLanguage();
  const { products, activityTypes, productMap, activityTypeMap, loading } = useMasterData();
  
  const [formData, setFormData] = useState({
    productId: preSelectedProduct || '',
    activityTypeId: '',
    openingQuantity: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filter products by activity type
  const filteredProducts = useCallback(() => {
    if (!formData.activityTypeId || !products) return products || [];
    return products.filter(p => p.activitytypeid === formData.activityTypeId);
  }, [products, formData.activityTypeId]);

  // Auto-select activity type when product is selected
  const handleProductChange = useCallback((productId: string) => {
    const product = productMap?.get(productId);
    setFormData(prev => ({
      ...prev,
      productId,
      activityTypeId: product?.activitytypeid || prev.activityTypeId
    }));
  }, [productMap]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.openingQuantity || !formData.activityTypeId) {
      setError(t('inventory.openingStock.error.fillAllFields', 'Please fill all required fields'));
      return;
    }

    const quantity = Number(formData.openingQuantity);
    if (quantity < 0) {
      setError(t('inventory.openingStock.error.positiveQuantity', 'Quantity must be positive'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Check if opening stock already exists
      const hasOpening = await inventoryService.hasOpeningStock(formData.productId);
      if (hasOpening) {
        setError(t('inventory.openingStock.error.alreadyExists', 'Opening stock already exists for this product'));
        setIsSubmitting(false);
        return;
      }

      const product = productMap?.get(formData.productId);
      const activityType = activityTypeMap?.get(formData.activityTypeId);

      await inventoryService.addOpeningStock({
        productId: formData.productId,
        productName: product?.productid || 'Unknown Product',
        activityTypeId: formData.activityTypeId,
        activityTypeName: activityType?.name || 'Unknown Activity',
        openingQuantity: quantity,
        date: new Date(formData.date)
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding opening stock:', err);
      setError(t('inventory.openingStock.error.failed', 'Failed to add opening stock'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, productMap, activityTypeMap, t, onSuccess, onClose]);

  if (loading) return null;

  return (
    <Modal show={isOpen} onClose={onClose} size="md">
      <Modal.Header className="bg-gradient-to-r from-purple-50 to-purple-100">
        <h3 className="text-lg font-semibold text-purple-900">
          {t('inventory.openingStock.title', 'Setup Opening Stock')}
        </h3>
      </Modal.Header>
      
      <Modal.Body className="bg-white">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <HiInformationCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-blue-800 font-medium">
                {t('inventory.openingStock.info.title', 'One-time Setup')}
              </h4>
              <p className="text-blue-700 text-sm mt-1">
                {t('inventory.openingStock.info.description', 
                  'This establishes the starting inventory for a product. Only needed once per product.')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">{t('inventory.fields.date', 'Date')}</Label>
            <TextInput
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="activityType">{t('inventory.fields.activityType', 'Activity Type')}</Label>
            <Select
              id="activityType"
              value={formData.activityTypeId}
              onChange={(e) => setFormData(prev => ({ ...prev, activityTypeId: e.target.value }))}
              required
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {activityTypes?.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="product">{t('inventory.fields.product', 'Product')}</Label>
            <Select
              id="product"
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {filteredProducts().map(product => (
                <option key={product.id} value={product.id}>
                  {product.productid}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">{t('inventory.openingStock.fields.quantity', 'Opening Quantity')}</Label>
            <TextInput
              type="number"
              id="quantity"
              value={formData.openingQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, openingQuantity: e.target.value }))}
              min="0"
              required
              placeholder="0"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </form>
      </Modal.Body>

      <Modal.Footer className="bg-gray-50">
        <div className="flex justify-end space-x-3 w-full">
          <Button
            color="gray"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <HiX className="h-4 w-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            color="purple"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <HiCheck className="h-4 w-4 mr-2" />
            {isSubmitting 
              ? t('common.adding', 'Adding...') 
              : t('inventory.openingStock.actions.add', 'Add Opening Stock')
            }
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
} 