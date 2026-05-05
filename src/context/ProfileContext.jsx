import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ProfileCtx = createContext(null)

// Which form field maps to which profile field
const FORM_MAP = {
  seguranca: { colaborador: 'nome' },
  ambiental: { responsavel: 'nome' },
  ergonomia: { colaborador: 'nome', funcao: 'funcao', setor: 'setor' },
  veiculo:   { operador: 'nome' },
  turno:     { supervisor_saida: 'nome' },
  inspecao:  { inspector: 'nome' },
}

function buildDefaults(profile, formType) {
  const map = FORM_MAP[formType] || {}
  const result = {}
  for (const [formField, profileField] of Object.entries(map)) {
    if (profile[profileField]) result[formField] = profile[profileField]
  }
  return result
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfileState] = useState({ nome: '', funcao: '', matricula: '', setor: '' })

  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(`profile_${user.id}`)
    if (stored) {
      try { setProfileState(JSON.parse(stored)) } catch { /* corrupted data */ }
    }
  }, [user])

  const setProfile = (data) => {
    setProfileState(data)
    if (user) localStorage.setItem(`profile_${user.id}`, JSON.stringify(data))
  }

  const getDefaults = (formType) => buildDefaults(profile, formType)

  return (
    <ProfileCtx.Provider value={{ profile, setProfile, getDefaults }}>
      {children}
    </ProfileCtx.Provider>
  )
}

export const useProfile = () => useContext(ProfileCtx)
