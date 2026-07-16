export type ProductLookupResult = {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_front_url?: string;
  image_url?: string;
};

type OpenFoodFactsResponse = {
  status?: number;
  product?: OpenFoodFactsProduct;
};

const cleanValue = (value?: string) => value?.trim().replace(/\s+/g, ' ');

export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResult | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanBarcode)}.json`);
  if (!response.ok) {
    throw new Error('Product lookup failed.');
  }

  const data = await response.json() as OpenFoodFactsResponse;
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const name = cleanValue(product.product_name) || cleanValue(product.product_name_en) || cleanValue(product.generic_name);

  return {
    barcode: cleanBarcode,
    name: name || `Barcode ${cleanBarcode}`,
    brand: cleanValue(product.brands),
    category: cleanValue(product.categories),
    imageUrl: cleanValue(product.image_front_url) || cleanValue(product.image_url),
  };
}
