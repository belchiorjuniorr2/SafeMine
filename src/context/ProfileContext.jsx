import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const ProfileCtx = createContext(null)

const EMPTY = { nome: '', funcao: '', matricula: '', setor: '', turno: '' }

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

function extractProfile(meta = {}) {
  return {
    nome:      meta.nome      || '',
    funcao:    meta.funcao    || '',
    matricula: meta.matricula || '',
    setor:     meta.setor     || '',
    turno:     meta.turno     || '',
  }
}

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  // Load immediately from user_metadata so Profile screen shows data on first render
  const [profile, setProfileState] = useState(() => extractProfile(user?.user_metadata))
  const [saving, setSaving] = useState(false)

  // Re-sync when user object changes (e.g. after updateUser resolves)
  useEffect(() => {
    if (!user) return
    setProfileState(extractProfile(user.user_metadata))
  }, [user])

  const setProfile = async (data) => {
    setSaving(true)
    setProfileState(data)
    const { data: updated, error } = await supabase.auth.updateUser({ data })
    if (!error && updated?.user) {
      setProfileState(extractProfile(updated.user.user_metadata))
    }
    setSaving(false)
    return !error
  }

  const getDefaults = (formType) => buildDefaults(profile, formType)

  return (
    <ProfileCtx.Provider value={{ profile, setProfile, getDefaults, saving }}>
      {children}
    </ProfileCtx.Provider>
  )
}

export const useProfile = () => useContext(ProfileCtx)
