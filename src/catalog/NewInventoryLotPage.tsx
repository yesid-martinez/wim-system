import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CatalogFrame } from './WatchCatalogPage'
import {
  createInventoryLot,
  getWatchOptions,
  type InventoryLotInput,
  type WatchOption,
} from './catalog-data'

export function NewInventoryLotPage() {
  const [searchParams] = useSearchParams()
  const requestedReference = searchParams.get('id')
  const navigate = useNavigate()
  const [watches, setWatches] = useState<WatchOption[]>([])
  const [watchId, setWatchId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [watchCost, setWatchCost] = useState('')
  const [shipping, setShipping] = useState('')
  const [fees, setFees] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    void getWatchOptions()
      .then((options) => {
        if (!active) return
        setWatches(options)
        const matchingWatch = options.find(
          (watch) => watch.reference === requestedReference,
        )
        if (matchingWatch) setWatchId(String(matchingWatch.watchId))
        else if (options.length === 1) setWatchId(String(options[0].watchId))
        else if (requestedReference) {
          setError('No se encontró la referencia solicitada.')
        }
      })
      .catch((caughtError: unknown) => {
        if (!active) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudieron cargar las referencias.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestedReference])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const selectedWatchId = Number(watchId)
    const selectedWatch = watches.find((watch) => watch.watchId === selectedWatchId)
    if (!selectedWatch) {
      setError('Selecciona una referencia válida.')
      return
    }

    const lot: InventoryLotInput = {
      quantity: Number(quantity),
      purchaseDate,
      watchCost: Number(watchCost),
      shipping: Number(shipping),
      fees: Number(fees),
    }

    setSubmitting(true)
    try {
      await createInventoryLot(selectedWatchId, lot)
      navigate(`/watches-ref?id=${encodeURIComponent(selectedWatch.reference)}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo guardar el lote.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CatalogFrame>
      <section className="reference-form-page">
        <header className="catalog-heading">
          <p className="eyebrow">Inventario</p>
          <h1>Ingresar lote</h1>
          <p>
            Añade unidades a una referencia. El costo unitario y los precios
            sugeridos se calculan automáticamente.
          </p>
        </header>

        {loading ? (
          <p className="catalog-status" aria-live="polite">
            Cargando referencias…
          </p>
        ) : error && watches.length === 0 ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : watches.length === 0 ? (
          <section className="catalog-notice">
            <h2>No hay referencias todavía</h2>
            <p>Crea una referencia antes de ingresar su primer lote.</p>
            <Link className="button button-secondary" to="/new">
              Crear referencia
            </Link>
          </section>
        ) : (
          <form className="reference-form" onSubmit={handleSubmit}>
            <label htmlFor="lot-watch">Referencia</label>
            <select
              id="lot-watch"
              onChange={(event) => {
                setWatchId(event.target.value)
                setError(null)
              }}
              required
              value={watchId}
            >
              <option value="" disabled>
                Selecciona una referencia
              </option>
              {watches.map((watch) => (
                <option key={watch.watchId} value={watch.watchId}>
                  {watch.reference} — {watch.name}
                </option>
              ))}
            </select>

            <label htmlFor="lot-quantity">Cantidad</label>
            <input
              id="lot-quantity"
              min="1"
              onChange={(event) => setQuantity(event.target.value)}
              required
              step="1"
              type="number"
              value={quantity}
            />

            <label htmlFor="lot-purchase-date">Fecha de compra</label>
            <input
              id="lot-purchase-date"
              onChange={(event) => setPurchaseDate(event.target.value)}
              required
              type="date"
              value={purchaseDate}
            />

            <label htmlFor="lot-watch-cost">Costo de los relojes (COP)</label>
            <input
              id="lot-watch-cost"
              min="0"
              onChange={(event) => setWatchCost(event.target.value)}
              required
              step="0.01"
              type="number"
              value={watchCost}
            />

            <label htmlFor="lot-shipping">Envío (COP)</label>
            <input
              id="lot-shipping"
              min="0"
              onChange={(event) => setShipping(event.target.value)}
              required
              step="0.01"
              type="number"
              value={shipping}
            />

            <label htmlFor="lot-fees">Gastos adicionales (COP)</label>
            <input
              id="lot-fees"
              min="0"
              onChange={(event) => setFees(event.target.value)}
              required
              step="0.01"
              type="number"
              value={fees}
            />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="button button-primary"
              disabled={
                submitting ||
                !watchId ||
                !quantity ||
                !purchaseDate ||
                !watchCost ||
                !shipping ||
                !fees
              }
              type="submit"
            >
              {submitting ? 'Guardando lote…' : 'Guardar lote'}
            </button>
          </form>
        )}

      </section>
    </CatalogFrame>
  )
}
