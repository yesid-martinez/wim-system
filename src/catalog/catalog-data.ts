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

interface AdminWatchDetailRow {
  lot_id: number
  reference: string
  commercial_name: string
  quantity: number
  purchase_date: string
  watch_cost: number | string
  shipping: number | string
  fees: number | string
  unit_cost: number | string
  minimum_price: number | string
  medium_price: number | string
  recommended_price: number | string
}

interface MarketingWatchDetailRow {
  reference: string
  name: string
  recommended_price: number | string | null
}

export interface AdminWatchLot {
  lotId: number
  quantity: number
  purchaseDate: string
  watchCost: number
  shipping: number
  fees: number
  unitCost: number
  minimumPrice: number
  mediumPrice: number
  recommendedPrice: number
}

export interface AdminWatchDetail {
  reference: string
  name: string
  lots: AdminWatchLot[]
}

export interface MarketingWatchDetail {
  reference: string
  name: string
  recommendedPrice: number | null
}

export class DuplicateWatchReferenceError extends Error {
  constructor() {
    super('Ya existe un reloj con esa referencia.')
    this.name = 'DuplicateWatchReferenceError'
  }
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

export async function getAdminWatchDetail(
  reference: string,
): Promise<AdminWatchDetail | null> {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.')

  const { data, error } = await supabase
    .from('admin_watches_view')
    .select(
      'lot_id, reference, commercial_name, quantity, purchase_date, watch_cost, shipping, fees, unit_cost, minimum_price, medium_price, recommended_price',
    )
    .eq('reference', reference)
    .order('purchase_date')

  if (error) throw new Error(`No se pudo cargar el detalle: ${error.message}`)
  if (!data?.length) return null

  const rows = data as unknown as AdminWatchDetailRow[]
  const firstLot = rows[0]

  return {
    reference: firstLot.reference,
    name: firstLot.commercial_name,
    lots: rows.map((lot) => ({
      lotId: lot.lot_id,
      quantity: lot.quantity,
      purchaseDate: lot.purchase_date,
      watchCost: Number(lot.watch_cost),
      shipping: Number(lot.shipping),
      fees: Number(lot.fees),
      unitCost: Number(lot.unit_cost),
      minimumPrice: Number(lot.minimum_price),
      mediumPrice: Number(lot.medium_price),
      recommendedPrice: Number(lot.recommended_price),
    })),
  }
}

export async function getMarketingWatchDetail(
  reference: string,
): Promise<MarketingWatchDetail | null> {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.')

  const { data, error } = await supabase
    .from('marketing_watches_view')
    .select('reference, name, recommended_price')
    .eq('reference', reference)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`No se pudo cargar el detalle: ${error.message}`)
  if (!data) return null

  const watch = data as unknown as MarketingWatchDetailRow
  return {
    reference: watch.reference,
    name: watch.name,
    recommendedPrice: toPrice(watch.recommended_price),
  }
}

export async function createWatchReference(watch: {
  reference: string
  name: string
  movementType: string
  caseDiameter: number
}): Promise<void> {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.')

  const { data: existing, error: lookupError } = await supabase
    .from('watches')
    .select('watch_id')
    .eq('reference', watch.reference)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`No se pudo validar la referencia: ${lookupError.message}`)
  }
  if (existing) throw new DuplicateWatchReferenceError()

  const { error } = await supabase.from('watches').insert({
    reference: watch.reference,
    commercial_name: watch.name,
    movement_type: watch.movementType,
    case_diameter: watch.caseDiameter,
  })

  if (error?.code === '23505') throw new DuplicateWatchReferenceError()
  if (error) throw new Error(`No se pudo crear la referencia: ${error.message}`)
}
