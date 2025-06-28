import React, { useState, useCallback } from 'react';
import { Modal, Button, TextInput, Select, Label } from 'flowbite-react';
import { HiX, HiCheck, HiExclamationCircle } from 'react-icons/hi';
import { inventoryService } from '@/services/firestore/inventoryService';
import { useMasterData } from '@/hooks/useMasterData';
import { useLanguage } from '@/context/LanguageContext';

interface QuickAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedProduct?: string;
}

export default function QuickAdjustmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preSelectedProduct 
}: QuickAdjustmentModalProps) {
  const { t } = useLanguage();
  const { products, activityTypes, productMap, activityTypeMap, loading } = useMasterData();
  
  const [formData, setFormData] = useState({
    productId: preSelectedProduct || '',
    activityTypeId: '',
    adjustmentQuantity: '',
    reason: '',
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
    
    if (!formData.productId || !formData.adjustmentQuantity || !formData.activityTypeId) {
      setError(t('inventory.quickAdjustment.error.fillAllFields', 'Please fill all required fields'));
      return;
    }

    const quantity = Number(formData.adjustmentQuantity);
    if (quantity === 0) {
      setError(t('inventory.quickAdjustment.error.nonZeroQuantity', 'Adjustment quantity cannot be zero'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const product = productMap?.get(formData.productId);
      const activityType = activityTypeMap?.get(formData.activityTypeId);

      await inventoryService.addQuickAdjustment({
        productId: formData.productId,
        productName: product?.productid || 'Unknown Product',
        activityTypeId: formData.activityTypeId,
        activityTypeName: activityType?.name || 'Unknown Activity',
        adjustmentQuantity: quantity,
        reason: formData.reason,
        date: new Date(formData.date)
      });

      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        productId: '',
        activityTypeId: '',
        adjustmentQuantity: '',
        reason: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error adding quick adjustment:', err);
      setError(t('inventory.quickAdjustment.error.failed', 'Failed to add adjustment'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, productMap, activityTypeMap, t, onSuccess, onClose]);

  if (loading) return null;

  return (
    <Modal show={isOpen} onClose={onClose} size="md">
      <Modal.Header className="bg-gradient-to-r from-orange-50 to-orange-100">
        <h3 className="text-lg font-semibold text-orange-900">
          {t('inventory.quickAdjustment.title', 'Quick Stock Adjustment')}
        </h3>
      </Modal.Header>
      
      <Modal.Body className="bg-white">
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <HiExclamationCircle className="h-5 w-5 text-orange-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-orange-800 font-medium">
                {t('inventory.quickAdjustment.info.title', 'Daily Reconciliation')}
              </h4>
              <p className="text-orange-700 text-sm mt-1">
                {t('inventory.quickAdjustment.info.description', 
                  'Quickly adjust stock levels to match actual inventory counts. Use positive numbers to increase stock, negative to decrease.')}
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
            <Label htmlFor="quantity">
              {t('inventory.quickAdjustment.fields.quantity', 'Adjustment Quantity')}
              <span className="text-sm text-gray-500 ml-2">
                ({t('inventory.quickAdjustment.fields.quantityHint', '+/- numbers')})
              </span>
            </Label>
            <TextInput
              type="number"
              id="quantity"
              value={formData.adjustmentQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, adjustmentQuantity: e.target.value }))}
              required
              placeholder="0"
              helperText={t('inventory.quickAdjustment.fields.quantityHelp', 'Positive to add stock, negative to reduce stock')}
            />
          </div>

          <div>
            <Label htmlFor="reason">{t('inventory.quickAdjustment.fields.reason', 'Reason (Optional)')}</Label>
            <TextInput
              id="reason"
              value={formData.reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={t('inventory.quickAdjustment.fields.reasonPlaceholder', 'e.g., Physical count correction, damaged goods, etc.')}
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <HiCheck className="h-4 w-4 mr-2" />
            {isSubmitting 
              ? t('inventory.quickAdjustment.actions.adjusting', 'Adjusting...') 
              : t('inventory.quickAdjustment.actions.adjust', 'Adjust Stock')
            }
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
} 