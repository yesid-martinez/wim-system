import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getAdminWatchDetail,
  getAdminCatalog,
  getMarketingCatalog,
  getMarketingWatchDetail,
  type AdminWatchDetail,
  type MarketingWatchDetail,
  type WatchCatalogItem,
} from './catalog-data'

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const costFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

function WatchCard({ watch }: { watch: WatchCatalogItem }) {
  return (
    <Link
      className="watch-card"
      to={`/watches-ref?id=${encodeURIComponent(watch.reference)}`}
    >
      <div
        className="watch-card-image"
        data-image-path={watch.imagePath ?? undefined}
        role="img"
        aria-label={`Imagen de ${watch.name}`}
      >
        <span>Imagen pendiente</span>
      </div>
      <div className="watch-card-content">
        <p className="watch-card-reference">{watch.reference}</p>
        <h2>{watch.name}</h2>
        <p className="watch-card-description">
          {watch.description || 'Descripción pendiente.'}
        </p>
        <div className="watch-card-footer">
          <span className="watch-card-quantity">
            {watch.availableQuantity} disponibles
          </span>
          <strong className="watch-card-price">
            {watch.recommendedPrice === null
              ? 'Precio pendiente'
              : priceFormatter.format(watch.recommendedPrice)}
          </strong>
        </div>
      </div>
    </Link>
  )
}

export function WatchCatalogPage() {
  const { role } = useAuth()
  const [watches, setWatches] = useState<WatchCatalogItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!role) return
    let active = true

    const loadCatalog =
      role === 'admin' ? getAdminCatalog : getMarketingCatalog

    void loadCatalog()
      .then((items) => {
        if (active) setWatches(items)
      })
      .catch((caughtError: unknown) => {
        if (!active) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo cargar el catálogo.',
        )
      })

    return () => {
      active = false
    }
  }, [role])

  return (
    <CatalogFrame>
      <section className="catalog-heading">
        <p className="eyebrow">Inventario</p>
        <h1>Catálogo de relojes</h1>
        <p>Referencias, disponibilidad y precio recomendado.</p>
      </section>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!error && watches === null && (
        <p className="catalog-status" aria-live="polite">
          Cargando catálogo…
        </p>
      )}

      {!error && watches?.length === 0 && (
        <p className="catalog-status">
          Todavía no hay relojes para mostrar en el catálogo.
        </p>
      )}

      {watches && watches.length > 0 && (
        <section className="watch-grid" aria-label="Relojes disponibles">
          {watches.map((watch) => (
            <WatchCard key={watch.reference} watch={watch} />
          ))}
        </section>
      )}
    </CatalogFrame>
  )
}

export function WatchReferencePage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('id')
  const { role } = useAuth()

  return (
    <CatalogFrame>
      {!reference && (
        <DetailNotice message="No se especificó una referencia." />
      )}
      {reference && role === 'admin' && (
        <AdminWatchDetailPage reference={reference} />
      )}
      {reference && role === 'marketing' && (
        <MarketingWatchDetailPage reference={reference} />
      )}
    </CatalogFrame>
  )
}

function AdminWatchDetailPage({ reference }: { reference: string }) {
  const [detail, setDetail] = useState<AdminWatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void getAdminWatchDetail(reference)
      .then((watch) => {
        if (active) setDetail(watch)
      })
      .catch((caughtError: unknown) => {
        if (!active) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo cargar el detalle del reloj.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reference])

  if (loading) return <DetailStatus message="Cargando detalle…" />
  if (error) return <DetailNotice message={error} />
  if (!detail) return <DetailNotice message="No se encontró la referencia." />

  const totalQuantity = detail.lots.reduce(
    (total, lot) => total + lot.quantity,
    0,
  )

  return (
    <section className="watch-detail">
      <header className="catalog-heading">
        <p className="eyebrow">Detalle de referencia</p>
        <p className="watch-card-reference">{detail.reference}</p>
        <h1>{detail.name}</h1>
      </header>

      <section className="watch-detail-summary" aria-label="Resumen de inventario">
        <div>
          <span>Lotes</span>
          <strong>{detail.lots.length}</strong>
        </div>
        <div>
          <span>Unidades disponibles</span>
          <strong>{totalQuantity}</strong>
        </div>
      </section>

      <section className="watch-detail-section">
        <h2>Costos y precios sugeridos por lote</h2>
        <div className="watch-lots-table-wrap">
          <table className="watch-lots-table">
            <caption className="sr-only">
              Costos de adquisición y precios comerciales sugeridos por lote
            </caption>
            <thead>
              <tr>
                <th scope="col">Fecha de compra</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Costo del reloj</th>
                <th scope="col">Envío</th>
                <th scope="col">Gastos</th>
                <th scope="col">Costo unitario</th>
                <th scope="col">Mínimo</th>
                <th scope="col">Medio</th>
                <th scope="col">Recomendado</th>
              </tr>
            </thead>
            <tbody>
              {detail.lots.map((lot) => (
                <tr key={lot.lotId}>
                  <td>{formatPurchaseDate(lot.purchaseDate)}</td>
                  <td>{lot.quantity}</td>
                  <td>{costFormatter.format(lot.watchCost)}</td>
                  <td>{costFormatter.format(lot.shipping)}</td>
                  <td>{costFormatter.format(lot.fees)}</td>
                  <td>{costFormatter.format(lot.unitCost)}</td>
                  <td>{priceFormatter.format(lot.minimumPrice)}</td>
                  <td>{priceFormatter.format(lot.mediumPrice)}</td>
                  <td>{priceFormatter.format(lot.recommendedPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DetailBackLink />
    </section>
  )
}

function MarketingWatchDetailPage({ reference }: { reference: string }) {
  const [watch, setWatch] = useState<MarketingWatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void getMarketingWatchDetail(reference)
      .then((result) => {
        if (active) setWatch(result)
      })
      .catch((caughtError: unknown) => {
        if (!active) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo cargar el detalle del reloj.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reference])

  if (loading) return <DetailStatus message="Cargando detalle…" />
  if (error) return <DetailNotice message={error} />
  if (!watch) return <DetailNotice message="No se encontró la referencia." />

  return (
    <section className="watch-detail">
      <header className="catalog-heading">
        <p className="eyebrow">Detalle de referencia</p>
        <p className="watch-card-reference">{watch.reference}</p>
        <h1>{watch.name}</h1>
      </header>
      <section className="marketing-watch-price" aria-label="Precio de venta recomendado">
        <span>Precio recomendado</span>
        <strong>
          {watch.recommendedPrice === null
            ? 'No disponible'
            : priceFormatter.format(watch.recommendedPrice)}
        </strong>
      </section>
      <DetailBackLink />
    </section>
  )
}

function DetailStatus({ message }: { message: string }) {
  return (
    <p className="catalog-status" aria-live="polite">
      {message}
    </p>
  )
}

function DetailNotice({ message }: { message: string }) {
  return (
    <section className="catalog-notice">
      <p className="eyebrow">Detalle de referencia</p>
      <h1>{message}</h1>
      <DetailBackLink />
    </section>
  )
}

function DetailBackLink() {
  return (
    <Link className="button button-secondary" to="/watches">
      Volver al catálogo
    </Link>
  )
}

function formatPurchaseDate(date: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function CatalogFrame({ children }: { children: ReactNode }) {
  return (
    <main className="home-page">
      <header className="topbar">
        <Link className="brand" to="/home" aria-label="WIM, inicio">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WIM / Inventario de relojes</span>
        </Link>
        <Link className="text-button" to="/home">
          Volver al inicio
        </Link>
      </header>
      <div className="catalog-content">{children}</div>
    </main>
  )
}
