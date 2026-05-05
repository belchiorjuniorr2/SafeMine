import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Square, Loader, X } from 'lucide-react'

const ROUTE_MAP = {
  seguranca: '/seguranca',
  ambiental: '/ambiental',
  ergonomia: '/ergonomia',
  veiculo: '/veiculo',
  turno: '/turno',
  inspecao: '/inspecao',
}

const TYPE_LABELS = {
  seguranca: 'Segurança',
  ambiental: 'Ambiental',
  ergonomia: 'Ergonomia',
  veiculo: 'Veículo',
  turno: 'Passagem de Turno',
  inspecao: 'Inspeção',
}

function speak(text) {
  window.speechSynthesis?.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'pt-BR'
  u.rate = 0.9
  window.speechSynthesis?.speak(u)
}

async function classifyAndParse(transcript) {
  const key = import.meta.env.VITE_ANTHROPIC_KEY || ''
  if (!key) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Analise o relato de segurança mineira e identifique o tipo mais adequado, depois extraia os campos.

Tipos:
- seguranca: local, colaborador, descricao_ocorrencia, causa_raiz, acao_imediata, gravidade (Leve/Moderado/Grave)
- ambiental: local, responsavel, tipo_impacto, area_afetada, descricao, medida_tomada, nivel_criticidade (Baixo/Medio/Alto)
- ergonomia: setor, colaborador, funcao, posto_trabalho, descricao_risco, sintoma_relatado, recomendacao, prioridade (Baixa/Media/Alta)
- veiculo: placa, modelo, km_atual, operador, turno, e status de cada item (pneus/freios/luzes/buzina/extintor/triangulo/cinto/retrovisores/oleo/agua/combustivel) como OK/NOK/NA
- turno: frente_trabalho, turno_saida, turno_entrada, supervisor_saida, supervisor_entrada, equipamentos_operando, ocorrencias, pendencias, observacoes
- inspecao: area_inspecionada, inspector, tipo_inspecao (Rotina/Especial/Auditoria), conformidades, nao_conformidades, recomendacoes, prazo_acao, responsavel_acao

Retorne JSON com exatamente:
- "tipo": um dos valores acima
- "campos": objeto com os campos extraídos do relato
- "tratativas": array de 3 a 5 strings com ações recomendadas

Relato: "${transcript}"

Retorne APENAS o JSON, sem markdown.`
        }]
      })
    })
    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

export default function QuickVoiceCapture() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | recording | processing | done
  const [liveText, setLiveText] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [detectedType, setDetectedType] = useState(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const isRecordingRef = useRef(false)
  const finalTextRef = useRef('')
  const transcriptRef = useRef('')

  useEffect(() => () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    transcriptRef.current = ''
    finalTextRef.current = ''
    isRecordingRef.current = true

    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTextRef.current += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      const text = finalTextRef.current + interim
      transcriptRef.current = text
      setLiveText(text)
    }

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return
      isRecordingRef.current = false
      setPhase('idle')
      clearInterval(timerRef.current)
    }

    rec.onend = () => {
      if (isRecordingRef.current) {
        try { rec.start() } catch { /* already started */ }
      }
    }

    recognitionRef.current = rec
    rec.start()
    setPhase('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const openAndStart = () => {
    setOpen(true)
    setPhase('idle')
    setLiveText('')
    setSeconds(0)
    setDetectedType(null)
    navigator.vibrate?.([100, 50, 100])
    setTimeout(() => {
      speak('Pode falar o relato')
      setTimeout(startRecording, 1400)
    }, 300)
  }

  const stopAndProcess = async () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    setPhase('processing')
    speak('Processando relato')

    const text = transcriptRef.current.trim()
    if (!text) {
      setPhase('idle')
      speak('Nenhum áudio detectado. Tente novamente.')
      return
    }

    const result = await classifyAndParse(text)
    if (!result || !ROUTE_MAP[result.tipo]) {
      setPhase('idle')
      speak('Não consegui identificar o tipo de relato. Tente novamente.')
      return
    }

    setDetectedType(result.tipo)
    setPhase('done')
    speak(`Relato de ${TYPE_LABELS[result.tipo]} identificado. Abrindo formulário.`)
    navigator.vibrate?.([200])

    setTimeout(() => {
      setOpen(false)
      // Filter out null/empty values so profile defaults are not overridden by Claude's blanks
      const campos = Object.fromEntries(
        Object.entries(result.campos || {}).filter(([, v]) => v != null && v !== '')
      )
      navigate(ROUTE_MAP[result.tipo], {
        state: {
          _prefilled: campos,
          _suggestions: result.tratativas || [],
        }
      })
    }, 1600)
  }

  const close = () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    clearInterval(timerRef.current)
    window.speechSynthesis?.cancel()
    setOpen(false)
    setPhase('idle')
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
      <button
        onClick={openAndStart}
        style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'var(--orange)',
          border: 'none',
          borderRadius: '36px',
          padding: '0 28px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fff',
          fontWeight: 800,
          fontSize: '16px',
          boxShadow: '0 8px 32px rgba(255,94,20,0.5)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Mic size={22} />
        Gravar Relato
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)' }}
          onClick={phase === 'recording' ? undefined : close}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              padding: '20px 24px 44px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto 20px' }} />

            {phase !== 'recording' && phase !== 'processing' && (
              <button
                onClick={close}
                style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--gray)' }}
              >
                <X size={20} />
              </button>
            )}

            {phase === 'done' ? (
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span style={{ fontSize: '32px', lineHeight: 1 }}>✓</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#43a047', marginBottom: '6px' }}>
                  {TYPE_LABELS[detectedType]} identificado!
                </div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>Abrindo formulário com campos preenchidos...</div>
              </div>
            ) : phase === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                <Loader size={44} color="var(--orange)" style={{ animation: 'qvSpin 1s linear infinite', marginBottom: '14px' }} />
                <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-dark)', marginBottom: '6px' }}>
                  Identificando relato...
                </div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>A IA está classificando e extraindo os campos</div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-dark)', marginBottom: '4px' }}>
                    {phase === 'recording' ? 'Gravando...' : 'Pronto para gravar'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: 1.5 }}>
                    {phase === 'recording'
                      ? 'Descreva o ocorrido com detalhes e toque em parar quando terminar'
                      : 'Fale o relato — a IA identifica o tipo e preenche o formulário automaticamente'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {phase === 'recording' && (
                      <>
                        <div style={{ position: 'absolute', width: '108px', height: '108px', borderRadius: '50%', background: 'rgba(229,57,53,0.12)', animation: 'qvPulse 1.5s ease-in-out infinite' }} />
                        <div style={{ position: 'absolute', width: '132px', height: '132px', borderRadius: '50%', background: 'rgba(229,57,53,0.06)', animation: 'qvPulse 1.5s ease-in-out infinite 0.4s' }} />
                      </>
                    )}
                    <button
                      onClick={phase === 'recording' ? stopAndProcess : startRecording}
                      style={{
                        width: '88px', height: '88px', borderRadius: '50%', border: 'none',
                        background: phase === 'recording' ? '#e53935' : 'var(--orange)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: phase === 'recording'
                          ? '0 8px 32px rgba(229,57,53,0.45)'
                          : '0 4px 24px rgba(255,94,20,0.4)',
                        cursor: 'pointer', position: 'relative', zIndex: 1,
                        transition: 'all 0.25s',
                      }}
                    >
                      {phase === 'recording' ? <Square size={30} fill="#fff" /> : <Mic size={30} />}
                    </button>
                  </div>

                  <div style={{
                    background: phase === 'recording' ? '#fff0ea' : '#f0f1f0',
                    borderRadius: '20px', padding: '6px 18px',
                    fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px',
                    color: phase === 'recording' ? '#e53935' : 'var(--text-dark)',
                    display: 'flex', alignItems: 'center', gap: '7px',
                    transition: 'all 0.25s',
                  }}>
                    {phase === 'recording' && (
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e53935', animation: 'qvDot 1s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
                    )}
                    {phase === 'recording' ? fmt(seconds) : 'TOQUE PARA GRAVAR'}
                  </div>
                </div>

                {liveText ? (
                  <div style={{
                    background: '#fff8f5',
                    border: '1.5px dashed var(--orange)',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '13px',
                    color: 'var(--text-mid)',
                    lineHeight: 1.6,
                    maxHeight: '90px',
                    overflowY: 'auto',
                  }}>
                    {liveText}
                    {phase === 'recording' && (
                      <span style={{ animation: 'qvBlink 1s step-end infinite', fontWeight: 700, color: 'var(--orange)' }}>|</span>
                    )}
                  </div>
                ) : (
                  <div style={{
                    border: '1.5px dashed var(--gray-mid)',
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'center',
                    color: 'var(--gray)',
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}>
                    {phase === 'recording' ? 'Escutando...' : 'O relato transcrito aparecerá aqui'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes qvPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.07);opacity:0.55} }
        @keyframes qvDot { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes qvSpin { to{transform:rotate(360deg)} }
        @keyframes qvBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </>
  )
}
