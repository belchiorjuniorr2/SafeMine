import { useRef } from 'react'
import { Paperclip, X, FileText } from 'lucide-react'

export default function FileAttach({ files, onChange }) {
  const inputRef = useRef(null)

  const add = (e) => {
    const next = [...files, ...Array.from(e.target.files)]
    onChange(next)
    e.target.value = ''
  }

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i))

  return (
    <div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {files.map((file, i) => {
            const isImg = file.type.startsWith('image/')
            return (
              <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--gray-mid)', background: '#f5f5f5', flexShrink: 0 }}>
                {isImg ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ width: '76px', height: '76px', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '76px', height: '76px', gap: '4px', padding: '6px' }}>
                    <FileText size={22} color="var(--gray)" />
                    <span style={{ fontSize: '10px', color: 'var(--gray)', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.2 }}>
                      {file.name.length > 16 ? file.name.slice(0, 14) + '…' : file.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => remove(i)}
                  style={{ position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                >
                  <X size={10} color="#fff" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '11px', borderRadius: '10px', border: '1.5px dashed var(--gray-mid)', background: '#fafafa', color: 'var(--gray)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        <Paperclip size={15} />
        Adicionar foto ou arquivo
      </button>
      <input ref={inputRef} type="file" accept="image/*,.pdf" multiple onChange={add} style={{ display: 'none' }} />
    </div>
  )
}
