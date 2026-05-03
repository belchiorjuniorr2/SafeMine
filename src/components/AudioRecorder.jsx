import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

const fieldPrompts = {
  seguranca: `local, data, hora, colaborador, descricao_ocorrencia, causa_raiz, acao_imediata, gravidade (Leve/Moderado/Grave)`,
  ambiental: `local, data, hora, responsavel, tipo_impacto, area_afetada, descricao, medida_tomada, nivel_criticidade (Baixo/Medio/Alto)`,
  ergonomia: `setor, data, colaborador, funcao, posto_trabalho, descricao_risco, sintoma_relatado, recomendacao, prioridade (Baixa/Media/Alta)`,
  veiculo: `placa, modelo, km_atual, operador, data, turno, e para cada item (pneus, freios, luzes, buzina, extintor, triangulo, cinto, retrovisores, oleo, agua, combustivel) o status OK/NOK/NA`,
  turno: `frente_trabalho, data, turno_saida, turno_entrada, supervisor_saida, supervisor_entrada, equipamentos_operando, ocorrencias, pendencias, observacoes`,
  inspecao: `area_inspecionada, data, hora, inspector, tipo_inspecao, conformidades, nao_conformidades, recomendacoes, prazo_acao, responsavel_acao`,
}

const suggestionsPrompts = {
  seguranca: `3 a 5 pontos de tratativa objetivos para prevenir a recorrência desta ocorrência de segurança`,
  ambiental: `3 a 5 ações de remediação e controle para este impacto ambiental`,
  ergonomia: `3 a 5 ações corretivas e preventivas para este risco ergonômico`,
  veiculo: `os principais pontos de atenção e manutenção identificados neste checklist`,
  turno: `as principais pendências e ações prioritárias para o próximo turno`,
  inspecao: `3 a 5 ações corretivas prioritárias identificadas nesta inspeção`,
}

async function parseWithAI(transcript, formType) {
  if (!ANTHROPIC_KEY) return { fields: { _noKey: true }, suggestions: [] }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Analise o relato e retorne JSON com exatamente dois campos:
- "campos": objeto com ${fieldPrompts[formType]}
- "tratativas": array de strings com ${suggestionsPrompts[formType]}

Relato: "${transcript}"

Retorne APENAS o JSON, sem markdown.`
        }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return {
      fields: parsed.campos || {},
      suggestions: Array.isArray(parsed.tratativas) ? parsed.tratativas : []
    }
  } catch {
    return { fields: { _error: true }, suggestions: [] }
  }
}

export default function AudioRecorder({ formType, onResult }) {
  const [state, setState] = useState('idle') // idle | recording | processing | filled
  const [liveText, setLiveText] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(true)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptRef = useRef('')

  useEffect(() => () => {
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
  }, [])

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.')
      return
    }
    transcriptRef.current = ''
    setLiveText('')
    setSuggestions([])
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ')
      transcriptRef.current = text
      setLiveText(text)
    }
    rec.onerror = () => setState('idle')
    recognitionRef.current = rec
    rec.start()
    setState('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRecording = async () => {
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    setState('processing')
    const text = transcriptRef.current || 'Sem transcrição'
    const { fields, suggestions: sugs } = await parseWithAI(text, formType)
    onResult(fields, text)
    if (sugs.length > 0) {
      setSuggestions(sugs)
      setSuggestionsOpen(true)
    }
    const filled = !fields._noKey && !fields._error
    if (filled) {
      setState('filled')
      setTimeout(() => setState('idle'), 3000)
    } else {
      setState('idle')
    }
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ paddingTop: '16px' }}>

      {/* Botão principal */}
      <div style={{ position: 'relative' }}>
        {state === 'recording' && (
          <div style={{
            position: 'absolute', inset: '-6px',
            borderRadius: '20px',
            border: '2px solid rgba(229,57,53,0.4)',
            animation: 'recordRing 1.2s ease-in-out infinite'
          }} />
        )}
        <button
          onPointerDown={state === 'idle' ? startRecording : undefined}
          onPointerUp={state === 'recording' ? stopRecording : undefined}
          onClick={state === 'processing' || state === 'filled' ? undefined : (state === 'recording' ? stopRecording : startRecording)}
          disabled={state === 'processing' || state === 'filled'}
          style={{
            width: '100%',
            padding: state === 'recording' ? '22px 18px' : '18px',
            borderRadius: '14px',
            border: 'none',
            background: state === 'recording' ? '#e53935'
              : state === 'filled' ? '#43a047'
              : state === 'processing' ? '#555'
              : '#333',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.3s, padding 0.2s',
            boxShadow: state === 'recording'
              ? '0 0 0 0 rgba(229,57,53,0.5)'
              : state === 'filled'
              ? '0 4px 16px rgba(67,160,71,0.35)'
              : '0 2px 8px rgba(0,0,0,0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {state === 'idle' && <><Mic size={22} /> Gravar Áudio</>}
          {state === 'recording' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', animation: 'recDot 1s ease-in-out infinite' }} />
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>{fmt(seconds)}</span>
                <Square size={18} fill="#fff" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.85 }}>Gravando — toque para parar</span>
            </div>
          )}
          {state === 'processing' && <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processando com IA...</>}
          {state === 'filled' && <>✓ Campos preenchidos pela IA</>}
        </button>
      </div>

      {/* Transcrição ao vivo — aparece abaixo do botão durante a gravação */}
      {(state === 'recording' || (state === 'processing' && liveText)) && (
        <div style={{
          marginTop: '10px',
          background: state === 'recording' ? '#fff8f7' : '#f5f5f5',
          border: `1.5px solid ${state === 'recording' ? 'rgba(229,57,53,0.2)' : 'var(--gray-mid)'}`,
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
          color: 'var(--text-mid)',
          lineHeight: 1.6,
          minHeight: '48px',
          transition: 'all 0.3s'
        }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: state === 'recording' ? '#e53935' : 'var(--gray)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            {state === 'recording' ? '● Transcrevendo' : 'Transcrição'}
          </span>
          {liveText || <span style={{ color: 'var(--gray)', fontStyle: 'italic' }}>Fale agora...</span>}
          {state === 'recording' && <span style={{ animation: 'blink 1s step-end infinite', fontWeight: 700, color: '#e53935' }}>|</span>}
        </div>
      )}

      {/* Dica quando idle */}
      {state === 'idle' && !suggestions.length && (
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--gray)', marginTop: '8px' }}>
          Toque e fale — a IA preenche os campos e sugere tratativas
        </p>
      )}

      {/* Sugestões de tratativa */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: '12px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setSuggestionsOpen(o => !o)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left'
            }}
          >
            <Lightbulb size={16} color="#d97706" />
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
              Sugestões de Tratativa ({suggestions.length})
            </span>
            {suggestionsOpen
              ? <ChevronUp size={16} color="#d97706" />
              : <ChevronDown size={16} color="#d97706" />
            }
          </button>
          {suggestionsOpen && (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#92400e', marginTop: '1px' }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes recordRing { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.02)} }
        @keyframes recDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
