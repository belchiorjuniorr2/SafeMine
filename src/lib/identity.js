/** Campos de identidade do relator — sempre do perfil, nunca da IA */
export const IDENTITY_KEYS = ['nome', 'matricula', 'funcao']

const ALIAS_KEYS = ['colaborador', 'operador', 'inspector', 'responsavel']

/** Remove identidade e aliases para não sobrescrever o perfil no formulário */
export function withoutIdentity(fields = {}) {
  const out = { ...fields }
  for (const k of IDENTITY_KEYS) delete out[k]
  for (const k of ALIAS_KEYS) delete out[k]
  return out
}

/** Aplica update da IA sem mexer em nome/matrícula/função já no form */
export function mergeAiIntoForm(prev, aiFields = {}, suggestions = []) {
  const update = withoutIdentity(aiFields)
  if (suggestions?.length) {
    update.tratativas = suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')
  }
  return { ...prev, ...update }
}
