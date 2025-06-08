import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductTypes,
  addProductType as addType,
  updateProductType as updateType,
  deleteProductType as deleteType,
  ProductType
} from '@/services/firestore/productTypesService';

export function useProductTypes() {
  const queryClient = useQueryClient();

  const { data: productTypes = [], isLoading } = useQuery({
    queryKey: ['productTypes'],
    queryFn: getProductTypes
  });

  const addProductType = useMutation({
    mutationFn: (data: Omit<ProductType, 'id'>) => addType(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productTypes'] })
  });

  const updateProductType = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ProductType>) => updateType(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productTypes'] })
  });

  const deleteProductType = useMutation({
    mutationFn: (id: string) => deleteType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productTypes'] })
  });

  return {
    productTypes,
    isLoading,
    addProductType: addProductType.mutateAsync,
    updateProductType: updateProductType.mutateAsync,
    deleteProductType: deleteProductType.mutateAsync
  };
} 