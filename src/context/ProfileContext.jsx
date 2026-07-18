import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const ProfileCtx = createContext(null)

const EMPTY = { nome: '', funcao: '', matricula: '', setor: '', turno: '' }

/** Campos extras por tipo (além de nome, matrícula e função, sempre incluídos) */
const FORM_MAP = {
  seguranca: { colaborador: 'nome' },
  ambiental: { responsavel: 'nome' },
  ergonomia: { colaborador: 'nome', setor: 'setor' },
  veiculo:   { operador: 'nome' },
  turno:     { supervisor_saida: 'nome' },
  inspecao:  { inspector: 'nome' },
}

function buildDefaults(profile, formType) {
  // Em todo relato: nome, matrícula e função do perfil
  const result = {}
  if (profile.nome) result.nome = profile.nome
  if (profile.matricula) result.matricula = profile.matricula
  if (profile.funcao) result.funcao = profile.funcao

  const map = FORM_MAP[formType] || {}
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

  // Re-sync when user changes; clear profile on logout
  useEffect(() => {
    if (!user) {
      setProfileState(EMPTY)
      return
    }
    setProfileState(extractProfile(user.user_metadata))
  }, [user])

  const setProfile = async (data) => {
    setSaving(true)
    setProfileState(data)
    try {
      const { data: updated, error } = await supabase.auth.updateUser({ data })
      if (error) {
        setProfileState(extractProfile(user?.user_metadata))
        return false
      }
      if (updated?.user) {
        setProfileState(extractProfile(updated.user.user_metadata))
      }
      return true
    } catch {
      setProfileState(extractProfile(user?.user_metadata))
      return false
    } finally {
      setSaving(false)
    }
  }

  const getDefaults = (formType) => buildDefaults(profile, formType)

  return (
    <ProfileCtx.Provider value={{ profile, setProfile, getDefaults, saving }}>
      {children}
    </ProfileCtx.Provider>
  )
}

export const useProfile = () => useContext(ProfileCtx)
