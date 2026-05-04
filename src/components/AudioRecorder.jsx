import { useState, useRef, useEffect } from 'react'
import { Mic, Loader } from 'lucide-react'

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
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptRef = useRef('')
  const finalTextRef = useRef('')
  const isRecordingRef = useRef(false)

  useEffect(() => () => {
    isRecordingRef.current = false
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
    finalTextRef.current = ''
    setLiveText('')
    isRecordingRef.current = true

    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTextRef.current += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      const text = finalTextRef.current + interim
      transcriptRef.current = text
      setLiveText(text)
    }

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return
      isRecordingRef.current = false
      setState('idle')
      clearInterval(timerRef.current)
    }

    rec.onend = () => {
      if (isRecordingRef.current) {
        try { rec.start() } catch { /* already started */ }
      }
    }

    recognitionRef.current = rec
    rec.start()
    setState('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRecording = async () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    setState('processing')
    const text = transcriptRef.current.trim() || 'Sem transcrição'
    const { fields, suggestions: sugs } = await parseWithAI(text, formType)
    onResult(fields, text, sugs)
    const filled = !fields._noKey && !fields._error
    setState(filled ? 'filled' : 'idle')
    if (filled) setTimeout(() => setState('idle'), 3000)
  }

  const handleToggle = () => {
    if (state === 'idle') startRecording()
    else if (state === 'recording') stopRecording()
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'
  const isFilled = state === 'filled'

  return (
    <div style={{ paddingTop: '8px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px' }}>
          {isRecording ? 'Gravando...' : isProcessing ? 'Processando...' : isFilled ? 'Campos preenchidos!' : 'Toque para gravar'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: 1.5, margin: 0, padding: '0 16px' }}>
          Descreva a ocorrência ou checklist detalhadamente. A IA preencherá os campos para você.
        </p>
      </div>

      {/* Circle button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRecording && (
            <>
              <div style={{ position: 'absolute', width: '124px', height: '124px', borderRadius: '50%', background: 'rgba(255,94,20,0.12)', animation: 'ringPulse 1.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', width: '148px', height: '148px', borderRadius: '50%', background: 'rgba(255,94,20,0.06)', animation: 'ringPulse 1.5s ease-in-out infinite 0.4s' }} />
            </>
          )}
          <button
            onClick={isProcessing || isFilled ? undefined : handleToggle}
            disabled={isProcessing || isFilled}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              border: 'none',
              background: isProcessing ? '#bbb' : isFilled ? '#43a047' : 'var(--orange)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isRecording
                ? '0 8px 32px rgba(255,94,20,0.45)'
                : isFilled
                ? '0 4px 20px rgba(67,160,71,0.4)'
                : '0 4px 24px rgba(255,94,20,0.35)',
              transition: 'all 0.25s',
              cursor: isProcessing || isFilled ? 'default' : 'pointer',
              position: 'relative',
              zIndex: 1
            }}
          >
            {isProcessing
              ? <Loader size={38} style={{ animation: 'spin 1s linear infinite' }} />
              : isFilled
              ? <span style={{ fontSize: '38px', lineHeight: 1 }}>✓</span>
              : <Mic size={38} />
            }
          </button>
        </div>

        {/* Label pill below button */}
        <div style={{
          background: isRecording ? '#fff0ea' : isFilled ? '#e8f5e9' : '#f0f1f0',
          borderRadius: '20px',
          padding: '8px 22px',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          color: isRecording ? 'var(--orange)' : isFilled ? '#43a047' : 'var(--text-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'all 0.25s'
        }}>
          {isRecording && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--orange)', display: 'inline-block', animation: 'recDot 1s ease-in-out infinite', flexShrink: 0 }} />
          )}
          {isProcessing ? 'PROCESSANDO...' : isFilled ? 'PREENCHIDO!' : isRecording ? fmt(seconds) : 'GRAVAR'}
        </div>
      </div>

      {/* Transcription section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--orange)', fontSize: '15px', fontWeight: 700 }}>✦</span>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-dark)', textTransform: 'uppercase' }}>Transcrição da IA</span>
        </div>
        <div style={{
          border: `1.5px dashed ${isRecording ? 'var(--orange)' : 'var(--gray-mid)'}`,
          borderRadius: '12px',
          padding: '18px 16px',
          minHeight: '88px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: liveText ? 'flex-start' : 'center',
          justifyContent: 'center',
          background: isRecording ? '#fff8f5' : '#fafafa',
          transition: 'all 0.3s'
        }}>
          {liveText ? (
            <p style={{ fontSize: '13px', color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 }}>
              {liveText}
              {isRecording && <span style={{ animation: 'blink 1s step-end infinite', fontWeight: 700, color: 'var(--orange)' }}>|</span>}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '10px', height: '32px' }}>
                {[0.35, 0.65, 1, 0.55, 0.85, 0.45, 0.75, 0.4, 0.7, 0.95, 0.5].map((h, i) => (
                  <div key={i} style={{
                    width: '3px',
                    height: `${h * 28}px`,
                    borderRadius: '2px',
                    background: isRecording ? 'var(--orange)' : 'var(--gray-mid)',
                    animation: isRecording ? `wave${i % 3} 0.9s ease-in-out infinite ${i * 0.08}s` : 'none',
                    transition: 'background 0.3s'
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--gray)', fontStyle: 'italic' }}>
                {isRecording ? 'Escutando...' : 'O áudio transcrito aparecerá aqui...'}
              </span>
            </>
          )}
        </div>
      </div>

<style>{`
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:0.6} }
        @keyframes recDot { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes wave0 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.3)} }
        @keyframes wave1 { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1)} }
        @keyframes wave2 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(0.2)} }
      `}</style>
    </div>
  )
}
