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

export function normalizeProductTypeName(name: string | null | undefined): string {
  if (!name) {
    return 'Unknown';
  }

  const lowerCaseName = name.toLowerCase().trim();

  // Mapping for 'Bottled Water' variations
  if (
    lowerCaseName.includes('eau en bouteille') ||
    lowerCaseName.includes('water bottling') ||
    lowerCaseName.includes('bottles') ||
    lowerCaseName.includes('bouteille')
  ) {
    return 'Eau en bouteille';
  }

  // Mapping for 'Ice Blocks' variations
  if (
    lowerCaseName.includes('bloc de glace') ||
    lowerCaseName.includes('ice blocks')
  ) {
    return 'Bloc de Glace';
  }

  // Mapping for 'Ice Cubes' variations
  if (
    lowerCaseName.includes('glaçons') ||
    lowerCaseName.includes('cubes')
  ) {
    return 'Glaçons';
  }
  
  // Mapping for 'Bidon d'eau'
  if (
    lowerCaseName.includes("bidon d'eau") ||
    lowerCaseName.includes('water jug')
  ) {
    return "Bidon d'eau";
  }


  // Fallback to the original name if no mapping is found
  return name;
} 