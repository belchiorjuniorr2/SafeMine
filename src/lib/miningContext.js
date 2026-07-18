/**
 * Contexto de domínio: mineração a céu aberto (open-pit).
 * Usado na STT (prompt de vocabulário) e na extração de campos pela IA.
 *
 * Nota: esta operação NÃO utiliza caminhões fora de estrada (off-road / OTR).
 */

export const MINING_DOMAIN = {
  industry: 'mineração a céu aberto (open-pit / open-cast mining)',
  locale: 'Brasil',
  language: 'português brasileiro',
  note: 'Sem frota de caminhões fora de estrada (off-road/OTR)',
}

/** Vocabulário típico para melhorar transcrição e interpretação */
export const MINING_VOCABULARY = [
  // Operação / áreas
  'frente de lavra', 'banco', 'berm', 'rampa', 'pilha de estéril', 'pilha de minério',
  'britagem', 'pátio de estocagem', 'homogenização', 'carregamento', 'transporte',
  'desmonte', 'fogo', 'desmonte com explosivos', 'perfuratriz', 'mina a céu aberto',
  'área operacional', 'zona de exclusão', 'dreno', 'bacia de contenção', 'rejeito',
  // Equipamentos (sem caminhão fora de estrada)
  'escavadeira hidráulica', 'pá carregadeira', 'trator de esteira', 'motoniveladora',
  'perfuratriz', 'britador', 'correia transportadora', 'caminhão basculante',
  'caminhão rodoviário', 'utilitário', 'pickup', 'retroescavadeira', 'rolo compactador',
  'caçamba', 'veículo leve', 'veículo de apoio',
  // Segurança / SST
  'DDS', 'diálogo diário de segurança', 'NR-22', 'EPI', 'EPC', 'bloqueio e etiquetagem',
  'LOTO', 'isolamento de energia', 'quase acidente', 'near miss', 'incidente',
  'acidente de trabalho', 'análise de risco', 'APR', 'PT', 'permissão de trabalho',
  'trabalho a quente', 'espaço confinado', 'trabalho em altura', 'guincho',
  'cinto de segurança', 'capacetes', 'óculos de proteção', 'protetor auricular',
  'checklist de veículo', 'inspeção pré-uso', 'desvio de segurança',
  // Turnos / pessoas
  'turno A', 'turno B', 'turno C', 'passagem de turno', 'supervisor de turno',
  'operador', 'encarregado', 'técnico de segurança', 'brigada',
  // Ambiental / ergonomia
  'poeira', 'material particulado', 'ruído', 'vibração', 'derramamento de óleo',
  'contaminação de solo', 'água subterrânea', 'postura', 'sobrecarga', 'L.E.R.', 'DORT',
].join(', ')

export const MINING_SYSTEM_CONTEXT = `
Você é um assistente de SST (Saúde e Segurança do Trabalho) especializado em mineração a céu aberto no Brasil.

Contexto operacional:
- Ambiente: mina a céu aberto (open-pit), com frentes de lavra, bancos, rampas, pátios, britagem e transporte de minério/estéril.
- Equipamentos típicos desta operação: escavadeiras, pás carregadeiras, tratores de esteira, perfuratrizes, britadores, correias, caminhões basculantes/rodoviários, utilitários e veículos de apoio.
- IMPORTANTE: esta mina NÃO opera caminhões fora de estrada (off-road / OTR / "fora de estrada"). Não assuma nem sugira esse tipo de equipamento. Se o áudio for ambíguo, prefira "caminhão basculante", "caminhão rodoviário", "utilitário" ou o termo genérico "veículo".
- Riscos comuns: queda de material, tombamento de equipamento, atropelamento, explosivos/desmonte, poeira, ruído, vibração, ergonomia em cabines, impacto ambiental (óleo, efluentes, particulado).
- Normas e práticas: NR-22, EPI/EPC, DDS, APR, permissão de trabalho, checklist pré-uso, passagem de turno.

Vocabulário do setor (use e normalize termos corretos): ${MINING_VOCABULARY}.

Regras:
- Interprete o relato no contexto de operação de mina a céu aberto.
- Corrija termos distorcidos pela fala (ex.: "frente de labra" → "frente de lavra").
- NÃO normalize relatos para "caminhão fora de estrada" / off-road / OTR — essa frota não existe nesta mina.
- Seja objetivo, técnico e fiel ao que foi dito; não invente fatos.
- Responda sempre em português do Brasil.
`.trim()

/** Prompt curto para STT (whisper/transcribe) — melhora reconhecimento de termos */
export const STT_DOMAIN_PROMPT =
  'Relato de segurança em mineração a céu aberto no Brasil (sem caminhões fora de estrada). Termos: frente de lavra, banco, rampa, escavadeira, pá carregadeira, caminhão basculante, utilitário, britagem, desmonte, EPI, NR-22, DDS, checklist, poeira, quase acidente, passagem de turno, supervisor, operador, pátio de estocagem, bacia de contenção.'

export const TIPO_LABELS = {
  seguranca: 'Registro de Segurança',
  ambiental: 'Registro Ambiental',
  ergonomia: 'Registro Ergonômico',
  veiculo: 'Checklist de Veículo',
  turno: 'Passagem de Turno',
  inspecao: 'Inspeção de Segurança',
}
