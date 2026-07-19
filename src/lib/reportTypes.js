import {
  ShieldAlert,
  Leaf,
  Activity,
  Truck,
  ArrowLeftRight,
  ClipboardCheck,
  FolderSearch,
} from 'lucide-react'

/**
 * Metadados visuais dos tipos de relato — ícones Lucide + cores.
 * Substitui as PNGs recortadas por tiles limpos e consistentes.
 */
export const REPORT_TYPES = {
  seguranca: {
    key: 'seguranca',
    label: 'Segurança',
    sub: 'Registro de ocorrências',
    path: '/seguranca',
    Icon: ShieldAlert,
    color: '#E53935',
    colorSoft: '#FFEBEE',
    gradient: 'linear-gradient(145deg, #FF8A80 0%, #E53935 100%)',
    shadow: 'rgba(229, 57, 53, 0.28)',
  },
  ambiental: {
    key: 'ambiental',
    label: 'Ambiental',
    sub: 'Impacto ambiental',
    path: '/ambiental',
    Icon: Leaf,
    color: '#43A047',
    colorSoft: '#E8F5E9',
    gradient: 'linear-gradient(145deg, #81C784 0%, #2E7D32 100%)',
    shadow: 'rgba(67, 160, 71, 0.28)',
  },
  ergonomia: {
    key: 'ergonomia',
    label: 'Ergonomia',
    sub: 'Risco ergonômico',
    path: '/ergonomia',
    Icon: Activity,
    color: '#8E24AA',
    colorSoft: '#F3E5F5',
    gradient: 'linear-gradient(145deg, #CE93D8 0%, #7B1FA2 100%)',
    shadow: 'rgba(142, 36, 170, 0.28)',
  },
  veiculo: {
    key: 'veiculo',
    label: 'Veículo',
    sub: 'Checklist diário',
    path: '/veiculo',
    Icon: Truck,
    color: '#1E88E5',
    colorSoft: '#E3F2FD',
    gradient: 'linear-gradient(145deg, #64B5F6 0%, #1565C0 100%)',
    shadow: 'rgba(30, 136, 229, 0.28)',
  },
  turno: {
    key: 'turno',
    label: 'Passagem de Turno',
    sub: 'Troca de turno',
    path: '/turno',
    Icon: ArrowLeftRight,
    color: '#FB8C00',
    colorSoft: '#FFF3E0',
    gradient: 'linear-gradient(145deg, #FFB74D 0%, #EF6C00 100%)',
    shadow: 'rgba(251, 140, 0, 0.28)',
  },
  inspecao: {
    key: 'inspecao',
    label: 'Inspeção',
    sub: 'Inspeção de segurança',
    path: '/inspecao',
    Icon: ClipboardCheck,
    color: '#00897B',
    colorSoft: '#E0F2F1',
    gradient: 'linear-gradient(145deg, #4DB6AC 0%, #00695C 100%)',
    shadow: 'rgba(0, 137, 123, 0.28)',
  },
}

export const REGISTROS_VISUAL = {
  key: 'registros',
  label: 'Consultar Registros',
  sub: 'Visualize todos os registros enviados',
  Icon: FolderSearch,
  color: '#FF8A45',
  colorSoft: '#FFF4EC',
  gradient: 'linear-gradient(145deg, #FFB074 0%, #F07830 100%)',
  shadow: 'rgba(240, 120, 48, 0.28)',
}

export const REPORT_TYPE_LIST = Object.values(REPORT_TYPES)

export function getReportType(key) {
  return REPORT_TYPES[key] || null
}
