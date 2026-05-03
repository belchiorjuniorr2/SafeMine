import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader } from 'lucide-react'

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

async function parseWithAI(transcript, formType) {
  if (!ANTHROPIC_KEY) {
    return { _transcript: transcript, _noKey: true }
  }
  const prompts = {
    seguranca: `Extraia do texto: local, data, hora, colaborador, descricao_ocorrencia, causa_raiz, acao_imediata, gravidade (Leve/Moderado/Grave). Retorne JSON.`,
    ambiental: `Extraia do texto: local, data, hora, responsavel, tipo_impacto, area_afetada, descricao, medida_tomada, nivel_criticidade (Baixo/Medio/Alto). Retorne JSON.`,
    ergonomia: `Extraia do texto: setor, data, colaborador, funcao, posto_trabalho, descricao_risco, sintoma_relatado, recomendacao, prioridade (Baixa/Media/Alta). Retorne JSON.`,
    veiculo: `Extraia do texto: placa, modelo, km_atual, operador, data, turno, e para cada item de checklist (pneus, freios, luzes, buzina, extintor, triangulo, cinto, retrovisores, oleo, agua, combustivel) o status OK/NOK/NA. Retorne JSON.`,
    turno: `Extraia do texto: frente_trabalho, data, turno_saida, turno_entrada, supervisor_saida, supervisor_entrada, equipamentos_operando, ocorrencias, pendencias, observacoes. Retorne JSON.`,
    inspecao: `Extraia do texto: area_inspecionada, data, hora, inspector, tipo_inspecao, conformidades, nao_conformidades, recomendacoes, prazo_acao, responsavel_acao. Retorne JSON.`
  }

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
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `${prompts[formType]}\n\nTexto: "${transcript}"\n\nRetorne APENAS o JSON, sem markdown.`
        }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { _error: true }
  }
}

export default function AudioRecorder({ formType, onResult }) {
  const [state, setState] = useState('idle') // idle | recording | processing | filled
  const [transcript, setTranscript] = useState('')
  const [seconds, setSeconds] = useState(0)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

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
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true
    let fullText = ''

    rec.onresult = (e) => {
      fullText = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(fullText)
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
    const text = transcript || 'Sem transcrição'
    const parsed = await parseWithAI(text, formType)
    onResult(parsed, text)
    const filled = !parsed._noKey && !parsed._error
    if (filled) {
      setState('filled')
      setTimeout(() => setState('idle'), 3000)
    } else {
      setState('idle')
    }
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div style={{ padding: '20px 0 8px' }}>
      {transcript && (
        <div style={{
          background: '#f8f8f8',
          border: '1px solid var(--gray-mid)',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--text-mid)',
          lineHeight: 1.5,
          maxHeight: '80px',
          overflow: 'auto'
        }}>
          <span style={{ color: 'var(--gray)', fontSize: '11px', fontWeight: 600 }}>TRANSCRIÇÃO: </span>
          {transcript}
        </div>
      )}

      <button
        onPointerDown={state === 'idle' ? startRecording : undefined}
        onPointerUp={state === 'recording' ? stopRecording : undefined}
        onClick={state === 'processing' || state === 'filled' ? undefined : (state === 'recording' ? stopRecording : startRecording)}
        disabled={state === 'processing' || state === 'filled'}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: '14px',
          border: 'none',
          background: state === 'recording'
            ? '#e53935'
            : state === 'filled'
            ? '#43a047'
            : 'var(--gray)',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.3s',
          boxShadow: state === 'recording'
            ? '0 0 0 4px rgba(229,57,53,0.25)'
            : state === 'filled'
            ? '0 4px 16px rgba(67,160,71,0.35)'
            : 'var(--shadow)',
          animation: state === 'recording' ? 'pulse 1.5s infinite' : 'none'
        }}
      >
        {state === 'idle' && <><Mic size={22} /> Gravar Áudio</>}
        {state === 'recording' && <><Square size={20} fill="#fff" /> Gravando... {fmt(seconds)} — Toque para parar</>}
        {state === 'processing' && <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processando com IA...</>}
        {state === 'filled' && <>✓ Campos preenchidos pela IA</>}
      </button>
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--gray)', marginTop: '8px' }}>
        {state === 'idle' ? 'Toque e fale — a IA preenche os campos automaticamente' : ''}
      </p>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
