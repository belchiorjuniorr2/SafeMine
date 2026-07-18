import { useState, useRef, useEffect } from 'react'
import { Mic, Loader, Square } from 'lucide-react'
import { pickRecorderMime, transcribeAudio } from '../lib/openrouter'
import { parseFormFromTranscript } from '../lib/voiceAI'

/** Aguarda o MediaRecorder parar e devolve o Blob completo. */
function stopRecorderToBlob(recorder, chunksRef) {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      const type = recorder?.mimeType || chunksRef.current[0]?.type || 'audio/webm'
      resolve(new Blob(chunksRef.current, { type }))
    }

    if (!recorder || recorder.state === 'inactive') {
      finish()
      return
    }

    recorder.addEventListener('stop', finish, { once: true })
    try {
      if (recorder.state === 'recording') {
        try { recorder.requestData() } catch { /* */ }
      }
      recorder.stop()
    } catch {
      finish()
    }
    setTimeout(finish, 3000)
  })
}

/** Campos de identidade vêm só do perfil — a IA não sobrescreve */
const IDENTITY_KEYS = ['nome', 'matricula', 'funcao']

function stripIdentity(fields = {}) {
  const out = { ...fields }
  for (const k of IDENTITY_KEYS) delete out[k]
  // também evita sobrescrever com aliases antigos
  delete out.colaborador
  delete out.operador
  delete out.inspector
  delete out.responsavel
  return out
}

export default function AudioRecorder({
  formType,
  onResult,
  /** Transcrição vinda da gravação rápida da home */
  initialTranscript = '',
  /** Blob de áudio vindo da gravação rápida da home */
  initialAudioBlob = null,
}) {
  const [state, setState] = useState('idle') // idle | recording | processing | filled
  const [liveText, setLiveText] = useState(initialTranscript || '')
  const [audioUrl, setAudioUrl] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [statusHint, setStatusHint] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const isRecordingRef = useRef(false)
  const stoppingRef = useRef(false)
  const audioUrlRef = useRef('')
  const seededRef = useRef(false)

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const revokeAudio = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = ''
    }
    setAudioUrl('')
  }

  // Hidrata áudio + texto vindos da home (Gravar Relato)
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (initialTranscript) {
      setLiveText(initialTranscript)
      setState('filled')
      setTimeout(() => setState('idle'), 2500)
    }
    if (initialAudioBlob instanceof Blob && initialAudioBlob.size > 0) {
      const url = URL.createObjectURL(initialAudioBlob)
      audioUrlRef.current = url
      setAudioUrl(url)
    }
  }, [initialTranscript, initialAudioBlob])

  useEffect(() => () => {
    isRecordingRef.current = false
    try { mediaRecorderRef.current?.stop() } catch { /* */ }
    cleanupStream()
    clearInterval(timerRef.current)
    revokeAudio()
  }, [])

  const startRecording = async () => {
    if (stoppingRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Seu navegador não permite gravação de áudio. Use Chrome, Edge ou Safari atualizado.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
      streamRef.current = stream
      chunksRef.current = []
      setLiveText('')
      setErrorMsg('')
      setStatusHint('')
      revokeAudio()

      const mimeType = pickRecorderMime()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(200)
      isRecordingRef.current = true
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (err) {
      cleanupStream()
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
      alert(
        denied
          ? 'Permissão de microfone negada. Libere o microfone nas configurações do navegador.'
          : 'Não foi possível acessar o microfone. Tente novamente.'
      )
    }
  }

  const stopRecording = async () => {
    if (stoppingRef.current) return
    if (!isRecordingRef.current && mediaRecorderRef.current?.state !== 'recording') return

    stoppingRef.current = true
    isRecordingRef.current = false
    clearInterval(timerRef.current)
    setState('processing')
    setStatusHint('Transcrevendo áudio…')
    setErrorMsg('')

    const blob = await stopRecorderToBlob(mediaRecorderRef.current, chunksRef)
    cleanupStream()

    if (!blob || blob.size < 200) {
      setState('idle')
      setStatusHint('')
      stoppingRef.current = false
      setErrorMsg('Áudio muito curto. Grave por pelo menos 2–3 segundos.')
      return
    }

    // Player de áudio para ouvir o que foi gravado
    const url = URL.createObjectURL(blob)
    audioUrlRef.current = url
    setAudioUrl(url)

    // 1) Transcrição — mostra texto assim que chegar
    const tr = await transcribeAudio(blob)
    if (tr.error || !tr.text) {
      setState('idle')
      setStatusHint('')
      stoppingRef.current = false
      setErrorMsg(tr.error || 'Não foi possível obter a transcrição. Ouça o áudio e preencha manualmente.')
      if (tr.code === 'no_key') {
        alert('Configure VITE_OPENROUTER_API_KEY no arquivo .env e reinicie o servidor.')
      }
      onResult({ _error: true }, '', [])
      return
    }

    setLiveText(tr.text)
    setStatusHint('Preenchendo campos com IA…')

    // 2) Extração de campos (sem sobrescrever nome/matrícula/função)
    const parsed = await parseFormFromTranscript(tr.text, formType)
    stoppingRef.current = false

    const fields = stripIdentity(parsed.fields || {})
    const sugs = parsed.suggestions || []

    if (fields._noKey || fields._error) {
      setState('idle')
      setStatusHint('')
      setErrorMsg(parsed.error || 'Transcrição ok, mas falhou ao preencher os campos. Você pode copiar o texto e preencher.')
      // ainda entrega a transcrição ao form
      onResult({ _error: true }, tr.text, sugs)
      return
    }

    setStatusHint('')
    setErrorMsg('')
    onResult(fields, tr.text, sugs)
    setState('filled')
    setTimeout(() => setState('idle'), 3500)
  }

  const handleToggle = () => {
    if (state === 'idle') startRecording()
    else if (state === 'recording') stopRecording()
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'
  const isFilled = state === 'filled'

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px' }}>
          {isRecording ? 'Gravando...' : isProcessing ? 'Processando...' : isFilled ? 'Campos preenchidos!' : 'Toque para gravar'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--gray)', lineHeight: 1.5, margin: 0, padding: '0 16px' }}>
          {isProcessing
            ? (statusHint || 'Enviando áudio…')
            : isRecording
            ? 'Toque de novo no botão para parar e processar'
            : 'Toque uma vez para gravar e outra para parar. Nome, matrícula e função vêm do perfil.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRecording && (
            <>
              <div style={{ position: 'absolute', width: '124px', height: '124px', borderRadius: '50%', background: 'rgba(194,62,8,0.12)', animation: 'ringPulse 1.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', width: '148px', height: '148px', borderRadius: '50%', background: 'rgba(194,62,8,0.06)', animation: 'ringPulse 1.5s ease-in-out infinite 0.4s' }} />
            </>
          )}
          <button
            type="button"
            onClick={isProcessing || isFilled ? undefined : handleToggle}
            disabled={isProcessing || isFilled}
            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              border: 'none',
              background: isProcessing ? '#bbb' : isFilled ? '#43a047' : isRecording ? '#C23E08' : '#D94A0A',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isRecording
                ? '0 8px 32px rgba(194,62,8,0.5)'
                : isFilled
                ? '0 4px 20px rgba(67,160,71,0.4)'
                : '0 6px 24px rgba(217,74,10,0.45)',
              transition: 'all 0.25s',
              cursor: isProcessing || isFilled ? 'default' : 'pointer',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isProcessing
              ? <Loader size={38} style={{ animation: 'spin 1s linear infinite' }} />
              : isFilled
              ? <span style={{ fontSize: '38px', lineHeight: 1 }}>✓</span>
              : isRecording
              ? <Square size={34} fill="#fff" />
              : <Mic size={38} />}
          </button>
        </div>

        <div style={{
          background: isRecording ? '#fff0ea' : isFilled ? '#e8f5e9' : liveText ? '#fff8f5' : '#f0f1f0',
          borderRadius: '20px',
          padding: '8px 22px',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          color: isRecording ? '#C23E08' : isFilled ? '#43a047' : 'var(--text-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}>
          {isRecording && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C23E08', display: 'inline-block', animation: 'recDot 1s ease-in-out infinite', flexShrink: 0 }} />
          )}
          {isProcessing ? 'PROCESSANDO...' : isFilled ? 'PREENCHIDO!' : isRecording ? `${fmt(seconds)} · TOQUE P/ PARAR` : 'TOQUE P/ GRAVAR'}
        </div>
      </div>

      {/* Player de áudio */}
      {audioUrl && (
        <div style={{
          marginBottom: '14px',
          background: '#fff',
          border: '1.5px solid var(--gray-mid)',
          borderRadius: '14px',
          padding: '12px 14px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--text-dark)',
            marginBottom: '10px',
          }}>
            ✦ Áudio gravado — ouça aqui
          </div>
          <audio
            controls
            src={audioUrl}
            preload="metadata"
            style={{ width: '100%', height: 40, outline: 'none' }}
          />
        </div>
      )}

      {/* Transcrição */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ color: '#D94A0A', fontSize: '15px', fontWeight: 700 }}>✦</span>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-dark)', textTransform: 'uppercase' }}>
            Texto transcrito
          </span>
        </div>
        <div style={{
          border: `1.5px solid ${errorMsg ? '#fca5a5' : liveText || isRecording || isProcessing ? '#FFD0B0' : 'var(--gray-mid)'}`,
          borderRadius: '12px',
          padding: '16px',
          minHeight: '96px',
          background: errorMsg ? '#fff5f5' : liveText ? '#fff8f5' : '#fafafa',
        }}>
          {liveText ? (
            <p style={{ fontSize: '14px', color: 'var(--text-dark)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {liveText}
            </p>
          ) : errorMsg ? (
            <p style={{ fontSize: '13px', color: '#dc2626', lineHeight: 1.5, margin: 0 }}>
              {errorMsg}
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--gray)', fontStyle: 'italic', margin: 0, textAlign: 'center', paddingTop: 12 }}>
              {isRecording
                ? 'Gravando… toque no botão para parar'
                : isProcessing
                ? (statusHint || 'Transcrevendo… aguarde')
                : 'O texto da gravação aparece aqui depois de parar'}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:0.6} }
        @keyframes recDot { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
