interface NamedEntity {
  name: string;
  id: string;
}

export function getNameById<T extends NamedEntity>(id: string, items: T[]): string {
  const item = items.find(i => i.id === id);
  return item?.name || id;
}

export function getNameByIdFromMap<T extends NamedEntity>(id: string, map: Map<string, T>): string {
  const item = map.get(id);
  return item?.name || id;
}

export function getIdByName<T extends NamedEntity>(name: string, items: T[]): string {
  const item = items.find(i => i.name === name);
  return item?.id || name;
}

export function getIdByNameFromMap<T extends NamedEntity>(name: string, map: Map<string, T>): string {
  for (const [id, item] of map.entries()) {
    if (item.name === name) {
      return id;
    }
  }
  return name;
}

export const getName = (map: Map<string, any>, id: string): string => {
  if (!map || !id) return "Unknown";
  return map.get(id)?.name || map.get(id)?.productid || map.get(id)?.description || "Unknown";
};

export const getActivityTypeName = (map: Map<string, any>, id: string): string => {
  if (!map || !id) return "Unknown";
  return map.get(id)?.name || map.get(id)?.description || "Unknown";
};

export const getProductName = (map: Map<string, any>, id: string): string => {
  if (!map || !id) return "Unknown";
  return map.get(id)?.productid || map.get(id)?.name || "Unknown";
};

export const getExpenseTypeName = (map: Map<string, any>, id: string): string => {
  if (!map || !id) return "Unknown";
  return map.get(id)?.name || map.get(id)?.description || "Unknown";
}; 