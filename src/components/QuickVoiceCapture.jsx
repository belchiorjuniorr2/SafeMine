import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Square, Loader, X } from 'lucide-react'
import { pickRecorderMime } from '../lib/openrouter'
import { processAudioQuickCapture } from '../lib/voiceAI'

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

export default function QuickVoiceCapture() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | recording | processing | done
  const [liveText, setLiveText] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [detectedType, setDetectedType] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const isRecordingRef = useRef(false)

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => {
    isRecordingRef.current = false
    try { mediaRecorderRef.current?.stop() } catch { /* */ }
    cleanupStream()
    clearInterval(timerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      speak('Seu navegador não suporta gravação de áudio')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
      streamRef.current = stream
      chunksRef.current = []
      setLiveText('')

      const mimeType = pickRecorderMime()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(250)
      isRecordingRef.current = true
      setPhase('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      cleanupStream()
      speak('Não foi possível acessar o microfone')
      setPhase('idle')
    }
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
    if (!isRecordingRef.current && mediaRecorderRef.current?.state !== 'recording') return

    isRecordingRef.current = false
    clearInterval(timerRef.current)
    setPhase('processing')
    speak('Processando relato')

    const blob = await new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' }))
        return
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
        resolve(new Blob(chunksRef.current, { type }))
      }
      try {
        recorder.stop()
      } catch {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
    })

    cleanupStream()

    const result = await processAudioQuickCapture(blob, {
      onTranscript: (text) => setLiveText(text),
    })

    if (!result.ok) {
      setPhase('idle')
      if (result.transcript) setLiveText(result.transcript)
      if (result.code === 'no_key') {
        speak('Configure a chave da OpenRouter')
        alert('Configure VITE_OPENROUTER_API_KEY no arquivo .env e reinicie o servidor.')
      } else {
        speak(result.error || 'Não consegui identificar o tipo de relato. Tente novamente.')
      }
      return
    }

    if (!ROUTE_MAP[result.tipo]) {
      setPhase('idle')
      setLiveText(result.transcript || '')
      speak('Não consegui identificar o tipo de relato. Tente novamente.')
      return
    }

    setLiveText(result.transcript || '')
    setDetectedType(result.tipo)
    setPhase('done')
    speak(`Relato de ${TYPE_LABELS[result.tipo]} identificado. Abrindo formulário.`)
    navigator.vibrate?.([200])

    setTimeout(() => {
      setOpen(false)
      navigate(ROUTE_MAP[result.tipo], {
        state: {
          _prefilled: result.campos || {},
          _suggestions: result.tratativas || [],
          // para o formulário mostrar player + texto
          _transcript: result.transcript || '',
          _audioBlob: blob,
        },
      })
    }, 1600)
  }

  const close = () => {
    isRecordingRef.current = false
    try { mediaRecorderRef.current?.stop() } catch { /* */ }
    cleanupStream()
    clearInterval(timerRef.current)
    window.speechSynthesis?.cancel()
    setOpen(false)
    setPhase('idle')
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
      <button type="button" className="voice-fab" onClick={openAndStart} aria-label="Gravar relato por voz">
        <Mic size={22} aria-hidden />
        Gravar Relato
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(74, 85, 104, 0.28)', backdropFilter: 'blur(4px)' }}
          onClick={phase === 'recording' || phase === 'processing' ? undefined : close}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto 20px' }} />

            {phase !== 'recording' && phase !== 'processing' && (
              <button
                type="button"
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
                  Transcrevendo e identificando…
                </div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>
                  GPT-4o Mini Transcribe via OpenRouter
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-dark)', marginBottom: '4px' }}>
                    {phase === 'recording' ? 'Gravando...' : 'Pronto para gravar'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: 1.5 }}>
                    {phase === 'recording'
                      ? 'Toque de novo no botão para parar (não precisa segurar)'
                      : 'Toque uma vez para gravar · outra vez para parar'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {phase === 'recording' && (
                      <>
                        <div style={{ position: 'absolute', width: '108px', height: '108px', borderRadius: '50%', background: 'rgba(255,154,92,0.18)', animation: 'qvPulse 1.5s ease-in-out infinite' }} />
                        <div style={{ position: 'absolute', width: '132px', height: '132px', borderRadius: '50%', background: 'rgba(255,154,92,0.1)', animation: 'qvPulse 1.5s ease-in-out infinite 0.4s' }} />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={phase === 'recording' ? stopAndProcess : startRecording}
                      style={{
                        width: '88px', height: '88px', borderRadius: '50%', border: 'none',
                        background: phase === 'recording' ? '#B83608' : '#D94A0A',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: phase === 'recording'
                          ? '0 8px 28px rgba(184,54,8,0.5)'
                          : '0 6px 22px rgba(217,74,10,0.45)',
                        cursor: 'pointer', position: 'relative', zIndex: 1,
                        transition: 'all 0.25s',
                      }}
                    >
                      {phase === 'recording' ? <Square size={30} fill="#fff" /> : <Mic size={30} />}
                    </button>
                  </div>

                  <div style={{
                    background: phase === 'recording' ? 'var(--orange-wash)' : 'var(--gray-light)',
                    borderRadius: '20px', padding: '6px 18px',
                    fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px',
                    color: phase === 'recording' ? 'var(--orange-deep)' : 'var(--text-dark)',
                    display: 'flex', alignItems: 'center', gap: '7px',
                    transition: 'all 0.25s',
                  }}>
                    {phase === 'recording' && (
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--orange)', animation: 'qvDot 1s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
                    )}
                    {phase === 'recording' ? `${fmt(seconds)} · TOQUE P/ PARAR` : 'TOQUE P/ GRAVAR'}
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
                    {phase === 'recording'
                      ? 'Gravando áudio… a transcrição aparece ao parar'
                      : 'O relato transcrito aparecerá aqui'}
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
      `}</style>
    </>
  )
}
