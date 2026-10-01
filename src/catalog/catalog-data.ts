import { supabase } from '../lib/supabase'

export interface WatchCatalogItem {
  reference: string
  name: string
  description: string | null
  imagePath: string | null
  availableQuantity: number
  recommendedPrice: number | null
}

interface MarketingWatchRow {
  reference: string
  name: string
  description: string | null
  image_path: string | null
  available_quantity: number
  recommended_price: number | string | null
}

interface AdminWatchRow {
  reference: string
  commercial_name: string
  description: string | null
  image_path: string | null
  quantity: number
  recommended_price: number | string
}

function toPrice(value: number | string | null) {
  return value === null ? null : Number(value)
}

export async function getMarketingCatalog(): Promise<WatchCatalogItem[]> {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.')

  const { data, error } = await supabase
    .from('marketing_watches_view')
    .select(
      'reference, name, description, image_path, available_quantity, recommended_price',
    )
    .order('name')

  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`)

  return (data as unknown as MarketingWatchRow[]).map((watch) => ({
    reference: watch.reference,
    name: watch.name,
    description: watch.description,
    imagePath: watch.image_path,
    availableQuantity: watch.available_quantity,
    recommendedPrice: toPrice(watch.recommended_price),
  }))
}

export async function getAdminCatalog(): Promise<WatchCatalogItem[]> {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.')

  const { data, error } = await supabase
    .from('admin_watches_view')
    .select(
      'reference, commercial_name, description, image_path, quantity, recommended_price',
    )
    .order('commercial_name')

  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`)

  const catalog = new Map<string, WatchCatalogItem>()
  for (const lot of data as unknown as AdminWatchRow[]) {
    const existing = catalog.get(lot.reference)
    const price = Number(lot.recommended_price)

    if (existing) {
      existing.availableQuantity += lot.quantity
      existing.recommendedPrice = Math.max(existing.recommendedPrice ?? price, price)
      continue
    }

    catalog.set(lot.reference, {
      reference: lot.reference,
      name: lot.commercial_name,
      description: lot.description,
      imagePath: lot.image_path,
      availableQuantity: lot.quantity,
      recommendedPrice: price,
    })
  }

  return [...catalog.values()]
}
