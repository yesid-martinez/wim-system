import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  updateInventoryLot,
  updateWatchName,
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

  function refreshDetail() {
    setLoading(true)
    setError(null)
    void getAdminWatchDetail(reference)
      .then((watch) => setDetail(watch))
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo cargar el detalle del reloj.',
        )
      })
      .finally(() => setLoading(false))
  }

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
        {detail.description && (
          <p className="watch-detail-description">{detail.description}</p>
        )}
        <WatchNameEditor
          watchId={detail.watchId}
          name={detail.name}
          onSaved={(name) =>
            setDetail((current) => (current ? { ...current, name } : current))
          }
        />
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
        <Link
          className="button button-secondary"
          to={`/watches-ref-edit?id=${encodeURIComponent(detail.reference)}`}
        >
          Ingresar lote
        </Link>
      </section>

      <section className="watch-detail-section">
        {detail.lots.length === 0 ? (
          <p className="catalog-status">
            Esta referencia aún no tiene lotes de inventario.
          </p>
        ) : (
          <>
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
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lots.map((lot) => (
                    <AdminLotRow
                      key={lot.lotId}
                      lot={lot}
                      onSaved={refreshDetail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <DetailBackLink />
    </section>
  )
}

function WatchNameEditor({
  watchId,
  name,
  onSaved,
}: {
  watchId: number
  name: string
  onSaved: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const nextName = value.trim()
      await updateWatchName(watchId, nextName)
      onSaved(nextName)
      setEditing(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo actualizar el nombre.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        className="text-button watch-name-edit-button"
        onClick={() => {
          setValue(name)
          setEditing(true)
        }}
        type="button"
      >
        Editar nombre
      </button>
    )
  }

  return (
    <form className="watch-name-form" onSubmit={handleSubmit}>
      <label htmlFor="watch-detail-name">Nombre</label>
      <input
        autoFocus
        id="watch-detail-name"
        onChange={(event) => setValue(event.target.value)}
        required
        value={value}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="watch-edit-actions">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar nombre'}
        </button>
        <button
          className="button button-secondary"
          disabled={saving}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function AdminLotRow({
  lot,
  onSaved,
}: {
  lot: AdminWatchDetail['lots'][number]
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [quantity, setQuantity] = useState(String(lot.quantity))
  const [purchaseDate, setPurchaseDate] = useState(lot.purchaseDate)
  const [watchCost, setWatchCost] = useState(String(lot.watchCost))
  const [shipping, setShipping] = useState(String(lot.shipping))
  const [fees, setFees] = useState(String(lot.fees))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateInventoryLot(lot.lotId, {
        quantity: Number(quantity),
        purchaseDate,
        watchCost: Number(watchCost),
        shipping: Number(shipping),
        fees: Number(fees),
      })
      setEditing(false)
      onSaved()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo actualizar el lote.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={10}>
          <form className="lot-edit-form" onSubmit={handleSubmit}>
            <p>
              Guardar reemplazará los valores actuales de este lote; los precios
              calculados se actualizarán automáticamente.
            </p>
            <div className="lot-edit-fields">
              <label>
                Cantidad
                <input
                  min="1"
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  step="1"
                  type="number"
                  value={quantity}
                />
              </label>
              <label>
                Fecha de compra
                <input
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  required
                  type="date"
                  value={purchaseDate}
                />
              </label>
              <label>
                Costo de los relojes (COP)
                <input
                  min="0"
                  onChange={(event) => setWatchCost(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={watchCost}
                />
              </label>
              <label>
                Envío (COP)
                <input
                  min="0"
                  onChange={(event) => setShipping(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={shipping}
                />
              </label>
              <label>
                Gastos adicionales (COP)
                <input
                  min="0"
                  onChange={(event) => setFees(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={fees}
                />
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="watch-edit-actions">
              <button className="button button-primary" disabled={saving} type="submit">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                className="button button-secondary"
                disabled={saving}
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{formatPurchaseDate(lot.purchaseDate)}</td>
      <td>{lot.quantity}</td>
      <td>{costFormatter.format(lot.watchCost)}</td>
      <td>{costFormatter.format(lot.shipping)}</td>
      <td>{costFormatter.format(lot.fees)}</td>
      <td>{costFormatter.format(lot.unitCost)}</td>
      <td>{priceFormatter.format(lot.minimumPrice)}</td>
      <td>{priceFormatter.format(lot.mediumPrice)}</td>
      <td>{priceFormatter.format(lot.recommendedPrice)}</td>
      <td>
        <button
          className="text-button"
          onClick={() => setEditing(true)}
          type="button"
        >
          Editar lote
        </button>
      </td>
    </tr>
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

export function CatalogFrame({ children }: { children: ReactNode }) {
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
