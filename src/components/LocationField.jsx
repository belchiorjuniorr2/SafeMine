import { useMemo, useState, useEffect } from 'react'
import {
  LOCAIS_CATALOG,
  LOCAL_OUTRO,
  resolveLocalValue,
  matchCatalogId,
  locationFieldKey,
} from '../lib/locaisCatalog'

/**
 * Select de frentes/bancos/áreas + opção "Outro".
 * @param {string} formTipo - seguranca|ambiental|...
 * @param {object} f - form state
 * @param {function} setF - setState
 * @param {string} [fieldKey] - override field name
 * @param {string} [label]
 */
export default function LocationField({
  formTipo = 'seguranca',
  f,
  setF,
  fieldKey,
  label = 'Local',
  placeholder = 'Descreva o local',
}) {
  const key = fieldKey || locationFieldKey(formTipo)
  const current = f[key] || ''
  const initialId = matchCatalogId(current)
  const [selectedId, setSelectedId] = useState(initialId || '')
  const [custom, setCustom] = useState(
    initialId === LOCAL_OUTRO || !initialId ? current : '',
  )

  // sync when prefilled by AI / navigation
  useEffect(() => {
    const id = matchCatalogId(f[key] || '')
    if (id && id !== LOCAL_OUTRO) {
      setSelectedId(id)
      setCustom('')
    } else if (f[key]) {
      setSelectedId(LOCAL_OUTRO)
      setCustom(f[key])
    }
  }, [f[key], key])

  const options = useMemo(() => LOCAIS_CATALOG, [])

  const apply = (id, customText) => {
    const value = resolveLocalValue(id, customText)
    setF((p) => ({ ...p, [key]: value }))
  }

  const onSelect = (e) => {
    const id = e.target.value
    setSelectedId(id)
    if (id === LOCAL_OUTRO) {
      apply(LOCAL_OUTRO, custom)
    } else if (id) {
      apply(id, '')
      setCustom('')
    } else {
      setF((p) => ({ ...p, [key]: '' }))
    }
  }

  const onCustom = (e) => {
    const t = e.target.value
    setCustom(t)
    apply(LOCAL_OUTRO, t)
  }

  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select
        className="field-input"
        value={selectedId}
        onChange={onSelect}
        aria-label={label}
      >
        <option value="">Selecione a frente / área…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        <option value={LOCAL_OUTRO}>Outro (digitar)…</option>
      </select>
      {selectedId === LOCAL_OUTRO ? (
        <input
          className="field-input"
          style={{ marginTop: 8 }}
          value={custom}
          onChange={onCustom}
          placeholder={placeholder}
        />
      ) : null}
    </div>
  )
}
