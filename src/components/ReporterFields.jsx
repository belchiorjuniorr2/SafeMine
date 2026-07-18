/**
 * Campos de identificação do relator (nome, matrícula, função).
 * Preenchidos automaticamente pelo perfil do colaborador.
 */
export default function ReporterFields({ f, setF }) {
  const upd = (key) => (e) => setF((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="panel">
      <div className="panel__heading">Identificação do relator</div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Nome</label>
          <input
            className="field-input"
            value={f.nome || ''}
            onChange={upd('nome')}
            placeholder="Nome completo"
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label className="field-label">Matrícula</label>
          <input
            className="field-input"
            value={f.matricula || ''}
            onChange={upd('matricula')}
            placeholder="Ex: 00123"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field-label">Função</label>
        <input
          className="field-input"
          value={f.funcao || ''}
          onChange={upd('funcao')}
          placeholder="Ex: Operador de pá carregadeira"
          autoComplete="organization-title"
        />
      </div>
    </div>
  )
}
