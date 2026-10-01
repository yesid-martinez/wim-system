import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CatalogFrame } from './WatchCatalogPage'
import {
  createWatchReference,
  DuplicateWatchReferenceError,
} from './catalog-data'

export function NewWatchPage() {
  const navigate = useNavigate()
  const [reference, setReference] = useState('')
  const [name, setName] = useState('')
  const [movementType, setMovementType] = useState('')
  const [caseDiameter, setCaseDiameter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const normalizedReference = reference.trim()
      await createWatchReference({
        reference: normalizedReference,
        name: name.trim(),
        movementType: movementType.trim(),
        caseDiameter: Number(caseDiameter),
      })
      navigate(`/watches-ref?id=${encodeURIComponent(normalizedReference)}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof DuplicateWatchReferenceError
          ? caughtError.message
          : caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo crear la referencia.',
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
          <h1>Crear referencia</h1>
          <p>
            Registra los datos del reloj. Los lotes de inventario se agregan por
            separado.
          </p>
        </header>

        <form className="reference-form" onSubmit={handleSubmit}>
          <label htmlFor="watch-reference">Referencia</label>
          <input
            autoComplete="off"
            id="watch-reference"
            onChange={(event) => setReference(event.target.value)}
            required
            value={reference}
          />

          <label htmlFor="watch-name">Nombre</label>
          <input
            id="watch-name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />

          <label htmlFor="watch-movement">Movimiento</label>
          <input
            id="watch-movement"
            onChange={(event) => setMovementType(event.target.value)}
            required
            value={movementType}
          />

          <label htmlFor="watch-diameter">Diámetro de la caja (mm)</label>
          <input
            id="watch-diameter"
            max="999.99"
            min="0.01"
            onChange={(event) => setCaseDiameter(event.target.value)}
            required
            step="0.01"
            type="number"
            value={caseDiameter}
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
              !reference.trim() ||
              !name.trim() ||
              !movementType.trim() ||
              !caseDiameter
            }
            type="submit"
          >
            {submitting ? 'Creando referencia…' : 'Crear referencia'}
          </button>
        </form>
      </section>
    </CatalogFrame>
  )
}
