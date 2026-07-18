import { TIPO_LABELS } from './miningContext'

const FIELD_LABELS = {
  nome: 'Nome',
  matricula: 'Matrícula',
  funcao: 'Função',
  local: 'Local',
  data: 'Data',
  hora: 'Hora',
  colaborador: 'Colaborador',
  descricao_ocorrencia: 'Descrição da ocorrência',
  causa_raiz: 'Causa raiz',
  acao_imediata: 'Ação imediata',
  gravidade: 'Gravidade',
  tipo_impacto: 'Tipo de impacto',
  area_afetada: 'Área afetada',
  descricao: 'Descrição',
  medida_tomada: 'Medida tomada',
  nivel_criticidade: 'Nível de criticidade',
  setor: 'Setor',
  posto_trabalho: 'Posto de trabalho',
  descricao_risco: 'Descrição do risco',
  sintoma_relatado: 'Sintoma relatado',
  recomendacao: 'Recomendação',
  prioridade: 'Prioridade',
  placa: 'Placa',
  modelo: 'Modelo',
  km_atual: 'KM atual',
  operador: 'Operador',
  turno: 'Turno',
  frente_trabalho: 'Frente de trabalho',
  turno_saida: 'Turno saída',
  turno_entrada: 'Turno entrada',
  supervisor_saida: 'Supervisor saída',
  supervisor_entrada: 'Supervisor entrada',
  equipamentos_operando: 'Equipamentos operando',
  ocorrencias: 'Ocorrências',
  pendencias: 'Pendências',
  observacoes: 'Observações',
  area_inspecionada: 'Área inspecionada',
  inspector: 'Inspetor',
  tipo_inspecao: 'Tipo de inspeção',
  conformidades: 'Conformidades',
  nao_conformidades: 'Não conformidades',
  recomendacoes: 'Recomendações',
  prazo_acao: 'Prazo da ação',
  responsavel_acao: 'Responsável pela ação',
  tratativas: 'Tratativas recomendadas',
  pneus: 'Pneus',
  freios: 'Freios',
  luzes: 'Luzes',
  buzina: 'Buzina',
  extintor: 'Extintor',
  triangulo: 'Triângulo',
  cinto: 'Cinto',
  retrovisores: 'Retrovisores',
  oleo: 'Óleo',
  agua: 'Água',
  combustivel: 'Combustível',
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatValue(v) {
  if (v == null || v === '') return '—'
  if (Array.isArray(v)) {
    if (v.length && v[0]?.url) {
      return v.map((a) => `<a href="${esc(a.url)}" style="color:#FF5E14">${esc(a.name || a.url)}</a>`).join('<br/>')
    }
    return esc(v.join('; '))
  }
  if (typeof v === 'object') return esc(JSON.stringify(v))
  return esc(String(v)).replace(/\n/g, '<br/>')
}

function rowsFromDados(dados = {}) {
  const preferred = [
    'nome', 'matricula', 'funcao', 'data', 'hora', 'local', 'setor',
    'gravidade', 'nivel_criticidade', 'prioridade',
    'descricao_ocorrencia', 'descricao', 'descricao_risco',
    'causa_raiz', 'acao_imediata', 'medida_tomada',
    'tratativas', 'anexos',
  ]
  const keys = [
    ...preferred.filter((k) => dados[k] != null && dados[k] !== ''),
    ...Object.keys(dados).filter((k) => !preferred.includes(k) && !k.startsWith('_') && dados[k] != null && dados[k] !== ''),
  ]
  // unique
  const seen = new Set()
  const ordered = keys.filter((k) => {
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return ordered.map((k) => {
    const label = FIELD_LABELS[k] || k
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #EDF0F3;color:#6B7280;font-size:13px;width:38%;vertical-align:top;font-weight:600;">${esc(label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #EDF0F3;color:#4A5568;font-size:13px;vertical-align:top;line-height:1.5;">${formatValue(dados[k])}</td>
      </tr>`
  }).join('')
}

/**
 * Gera HTML de e-mail com layout SafeMine para um registro.
 */
export function buildReportEmailHtml({ tipo, dados, userEmail, createdAt }) {
  const tipoLabel = TIPO_LABELS[tipo] || tipo
  const when = createdAt
    ? new Date(createdAt).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR')
  const rows = rowsFromDados(dados)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F5F7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EDF0F3;box-shadow:0 8px 28px rgba(74,85,104,0.08);">
          <!-- header -->
          <tr>
            <td style="background:linear-gradient(135deg,#FF7A33,#FF5E14);padding:22px 24px;">
              <div style="color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.9;">SafeMine · Mineração a céu aberto</div>
              <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px;">Novo relato recebido</div>
              <div style="color:#FFE8D6;font-size:14px;margin-top:6px;">${esc(tipoLabel)}</div>
            </td>
          </tr>
          <!-- meta -->
          <tr>
            <td style="padding:18px 24px 8px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background:#FFF4EC;border-radius:12px;border:1px solid #FFE4D0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:12px;color:#8B939E;margin-bottom:4px;">Enviado em</div>
                    <div style="font-size:14px;color:#4A5568;font-weight:600;">${esc(when)}</div>
                    ${userEmail ? `<div style="font-size:12px;color:#8B939E;margin-top:10px;">Usuário do sistema</div>
                    <div style="font-size:14px;color:#4A5568;font-weight:600;">${esc(userEmail)}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- fields -->
          <tr>
            <td style="padding:8px 24px 8px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#8B939E;margin:8px 0 10px;">Detalhes do registro</div>
              <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #EDF0F3;border-radius:12px;overflow:hidden;">
                ${rows || '<tr><td style="padding:16px;color:#8B939E;font-size:13px;">Sem campos preenchidos.</td></tr>'}
              </table>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:20px 24px 24px;">
              <div style="font-size:12px;color:#9AA3B2;line-height:1.5;">
                Este e-mail foi gerado automaticamente pelo <strong style="color:#FF5E14;">SafeMine</strong> — Segurança em Campo.<br/>
                Ambiente de teste · mineração a céu aberto.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Versão texto puro (fallback / FormSubmit message) */
export function buildReportEmailText({ tipo, dados, userEmail, createdAt }) {
  const tipoLabel = TIPO_LABELS[tipo] || tipo
  const when = createdAt
    ? new Date(createdAt).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR')
  const lines = [
    `SafeMine — Novo relato: ${tipoLabel}`,
    `Data/hora do envio: ${when}`,
    userEmail ? `Usuário: ${userEmail}` : '',
    '',
    '--- Detalhes ---',
  ]
  for (const [k, v] of Object.entries(dados || {})) {
    if (k.startsWith('_') || v == null || v === '') continue
    if (k === 'anexos' && Array.isArray(v)) {
      lines.push(`Anexos: ${v.map((a) => a.url || a.name).join(', ')}`)
      continue
    }
    const label = FIELD_LABELS[k] || k
    lines.push(`${label}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
  }
  return lines.filter(Boolean).join('\n')
}
