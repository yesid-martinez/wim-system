import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getAdminCatalog,
  getMarketingCatalog,
  type WatchCatalogItem,
} from './catalog-data'

const priceFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
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

  return (
    <CatalogFrame>
      <section className="catalog-notice">
        <p className="eyebrow">Referencia seleccionada</p>
        <h1>{reference || 'No se especificó una referencia'}</h1>
        <p>La ficha detallada estará disponible en una etapa posterior.</p>
        <Link className="button button-secondary" to="/watches">
          Volver al catálogo
        </Link>
      </section>
    </CatalogFrame>
  )
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
