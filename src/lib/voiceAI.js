import { normalizeAIFields } from './normalizeAI'
import { MINING_SYSTEM_CONTEXT } from './miningContext'
import {
  chatCompletion,
  parseJsonLoose,
  transcribeAudio,
  getOpenRouterKey,
} from './openrouter'

const fieldPrompts = {
  // NÃO extrair nome/matricula/funcao — vêm do perfil do colaborador
  seguranca: `local, data, hora, descricao_ocorrencia, causa_raiz, acao_imediata, gravidade (Leve/Moderado/Grave)`,
  ambiental: `local, data, hora, tipo_impacto, area_afetada, descricao, medida_tomada, nivel_criticidade (Baixo/Médio/Alto)`,
  ergonomia: `setor, data, posto_trabalho, descricao_risco, sintoma_relatado, recomendacao, prioridade (Baixa/Média/Alta)`,
  veiculo: `placa, modelo, km_atual, data, turno, e para cada item (pneus, freios, luzes, buzina, extintor, triangulo, cinto, retrovisores, oleo, agua, combustivel) o status OK/NOK/NA`,
  turno: `frente_trabalho, data, turno_saida, turno_entrada, supervisor_saida, supervisor_entrada, equipamentos_operando, ocorrencias, pendencias, observacoes`,
  inspecao: `area_inspecionada, data, hora, tipo_inspecao, conformidades, nao_conformidades, recomendacoes, prazo_acao, responsavel_acao`,
}

const suggestionsPrompts = {
  seguranca: `3 a 5 pontos de tratativa objetivos para prevenir a recorrência desta ocorrência de segurança`,
  ambiental: `3 a 5 ações de remediação e controle para este impacto ambiental`,
  ergonomia: `3 a 5 ações corretivas e preventivas para este risco ergonômico`,
  veiculo: `os principais pontos de atenção e manutenção identificados neste checklist`,
  turno: `as principais pendências e ações prioritárias para o próximo turno`,
  inspecao: `3 a 5 ações corretivas prioritárias identificadas nesta inspeção`,
}

/**
 * Extrai campos + tratativas a partir do texto transcrito.
 */
export async function parseFormFromTranscript(transcript, formType) {
  if (!getOpenRouterKey()) {
    return { fields: { _noKey: true }, suggestions: [], error: 'no_key' }
  }

  const prompt = `${MINING_SYSTEM_CONTEXT}

Analise o relato de campo (mineração a céu aberto) e retorne JSON com exatamente dois campos:
- "campos": objeto com ${fieldPrompts[formType] || fieldPrompts.seguranca}
- "tratativas": array de strings com ${suggestionsPrompts[formType] || suggestionsPrompts.seguranca}

Regras:
- Normalize termos de mina (frente de lavra, britagem, desmonte, etc.). NÃO use "caminhão fora de estrada" (esta mina não tem).
- Omita campos que não foram mencionados. Não invente dados.
- NÃO inclua nome, matricula nem funcao (esses dados já vêm do perfil).

Relato: """${transcript}"""

Retorne APENAS o JSON.`

  const result = await chatCompletion(prompt, { maxTokens: 1200 })
  if (result.error) {
    return {
      fields: { _error: true },
      suggestions: [],
      error: result.error,
      code: result.code,
    }
  }

  const parsed = parseJsonLoose(result.text)
  if (!parsed) {
    return { fields: { _error: true }, suggestions: [], error: 'JSON inválido da IA' }
  }

  const rawFields = { ...(parsed.campos || {}) }
  // Nunca sobrescrever identidade do relator
  delete rawFields.nome
  delete rawFields.matricula
  delete rawFields.funcao
  delete rawFields.colaborador
  delete rawFields.operador
  delete rawFields.inspector
  delete rawFields.responsavel
  const suggestions = Array.isArray(parsed.tratativas) ? parsed.tratativas : []
  return {
    fields: normalizeAIFields(rawFields),
    suggestions,
  }
}

/**
 * Classifica o tipo de relato e extrai campos (gravação rápida da dashboard).
 */
export async function classifyAndParseTranscript(transcript) {
  if (!getOpenRouterKey()) return null

  const prompt = `${MINING_SYSTEM_CONTEXT}

Analise o relato de segurança em mineração a céu aberto e identifique o tipo mais adequado, depois extraia os campos.
Normalize jargão de mina (frente de lavra, desmonte, britagem, etc.). Não assuma caminhão fora de estrada/OTR.

Tipos:
- seguranca: local, descricao_ocorrencia, causa_raiz, acao_imediata, gravidade (Leve/Moderado/Grave)
- ambiental: local, tipo_impacto, area_afetada, descricao, medida_tomada, nivel_criticidade (Baixo/Médio/Alto)
- ergonomia: setor, posto_trabalho, descricao_risco, sintoma_relatado, recomendacao, prioridade (Baixa/Média/Alta)
- veiculo: placa, modelo, km_atual, turno, e status de cada item (pneus/freios/luzes/buzina/extintor/triangulo/cinto/retrovisores/oleo/agua/combustivel) como OK/NOK/NA
- turno: frente_trabalho, turno_saida, turno_entrada, supervisor_saida, supervisor_entrada, equipamentos_operando, ocorrencias, pendencias, observacoes
- inspecao: area_inspecionada, tipo_inspecao (Rotina/Especial/Auditoria), conformidades, nao_conformidades, recomendacoes, prazo_acao, responsavel_acao

Retorne JSON com exatamente:
- "tipo": um dos valores acima
- "campos": objeto com os campos extraídos do relato (omitir o que não foi dito; NÃO inclua nome/matricula/funcao)
- "tratativas": array de 3 a 5 strings com ações recomendadas

Relato: """${transcript}"""

Retorne APENAS o JSON.`

  const result = await chatCompletion(prompt, { maxTokens: 1500 })
  if (result.error) return null

  const parsed = parseJsonLoose(result.text)
  if (!parsed?.tipo) return null

  const campos = { ...(parsed.campos || {}) }
  delete campos.nome
  delete campos.matricula
  delete campos.funcao
  delete campos.colaborador
  delete campos.operador
  delete campos.inspector
  delete campos.responsavel

  return {
    tipo: parsed.tipo,
    campos: normalizeAIFields(campos),
    tratativas: Array.isArray(parsed.tratativas) ? parsed.tratativas : [],
  }
}

/**
 * Pipeline completo: blob de áudio → transcrição → campos.
 * onTranscript(text) é chamado assim que a STT terminar (antes do parse de campos).
 */
export async function processAudioForForm(blob, formType, { onTranscript } = {}) {
  const tr = await transcribeAudio(blob)
  if (tr.error) {
    return {
      ok: false,
      error: tr.error,
      code: tr.code,
      transcript: '',
      fields: tr.code === 'no_key' ? { _noKey: true } : { _error: true },
      suggestions: [],
    }
  }

  // Mostra texto na UI imediatamente
  try { onTranscript?.(tr.text) } catch { /* */ }

  const { fields, suggestions, error, code } = await parseFormFromTranscript(tr.text, formType)
  if (fields._noKey || fields._error) {
    return {
      ok: false,
      error: error || 'Falha ao extrair campos',
      code: code || 'parse',
      transcript: tr.text,
      fields,
      suggestions: suggestions || [],
    }
  }

  return {
    ok: true,
    transcript: tr.text,
    fields,
    suggestions,
  }
}

/**
 * Pipeline dashboard: blob → transcrição → classificar + campos.
 */
export async function processAudioQuickCapture(blob, { onTranscript } = {}) {
  const tr = await transcribeAudio(blob)
  if (tr.error) {
    return { ok: false, error: tr.error, code: tr.code, transcript: '' }
  }

  try { onTranscript?.(tr.text) } catch { /* */ }

  const result = await classifyAndParseTranscript(tr.text)
  if (!result) {
    return {
      ok: false,
      error: 'Não foi possível identificar o tipo de relato.',
      transcript: tr.text,
    }
  }

  return {
    ok: true,
    transcript: tr.text,
    tipo: result.tipo,
    campos: result.campos,
    tratativas: result.tratativas,
  }
}
