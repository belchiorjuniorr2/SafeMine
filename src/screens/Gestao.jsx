import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  LayoutDashboard,
  RefreshCw,
  Download,
  AlertTriangle,
  FileText,
  Activity,
  Inbox,
  Filter,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import Gauge from '../components/Gauge'
import { REPORT_TYPES } from '../lib/reportTypes'
import {
  buildAnalytics,
  getStatus,
  getGravidade,
  getCanal,
  canalLabel,
  getLocal,
  STATUS_LIST,
  recordsToCsv,
} from '../lib/analytics'

const TIPO_LABELS = Object.fromEntries(
  Object.entries(REPORT_TYPES).map(([k, v]) => [k, v.label]),
)

const PERIODS = [
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'all', label: 'Tudo' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="gestao-tooltip">
      {label ? <div className="gestao-tooltip__label">{label}</div> : null}
      {payload.map((p) => (
        <div key={p.name} className="gestao-tooltip__row">
          <span style={{ color: p.fill || p.color }}>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Gestao() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('30')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterCanal, setFilterCanal] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [updatingId, setUpdatingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('registros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (err) {
      setError(err.message || 'Falha ao carregar registros')
      setRecords([])
    } else {
      setRecords(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const maxAge =
      period === '7' ? 7 * 864e5 : period === '30' ? 30 * 864e5 : Infinity
    return records.filter((r) => {
      if (maxAge !== Infinity) {
        const t = r.created_at ? new Date(r.created_at).getTime() : 0
        if (now - t > maxAge) return false
      }
      if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false
      if (filterCanal !== 'todos' && getCanal(r) !== filterCanal) return false
      if (filterStatus !== 'todos' && getStatus(r).key !== filterStatus) return false
      return true
    })
  }, [records, period, filterTipo, filterCanal, filterStatus])

  const stats = useMemo(
    () => buildAnalytics(filtered, TIPO_LABELS),
    [filtered],
  )

  const reportRows = useMemo(() => filtered.slice(0, 40), [filtered])

  const updateStatus = async (rec, newStatus) => {
    setUpdatingId(rec.id)
    const nextDados = {
      ...(rec.dados || {}),
      _status: newStatus,
      _status_updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase
      .from('registros')
      .update({ dados: nextDados })
      .eq('id', rec.id)
    if (!err) {
      setRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, dados: nextDados } : r)),
      )
    } else {
      alert(err.message || 'Não foi possível atualizar o status')
    }
    setUpdatingId(null)
  }

  const exportCsv = () => {
    const csv = recordsToCsv(filtered)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `safemine-relatorios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    {
      label: 'Total no período',
      value: stats.total,
      hint: 'registros filtrados',
      color: '#FF8A45',
      Icon: FileText,
    },
    {
      label: 'Hoje',
      value: stats.today,
      hint: 'novos (horário BR)',
      color: '#1E88E5',
      Icon: Activity,
    },
    {
      label: 'Alta gravidade',
      value: stats.high,
      hint: 'Grave / Alto / Alta',
      color: '#E53935',
      Icon: AlertTriangle,
    },
    {
      label: 'Em aberto',
      value: stats.open,
      hint: 'novo + em análise',
      color: '#FB8C00',
      Icon: Inbox,
    },
  ]

  return (
    <div className="app-shell app-shell--wide gestao-page">
      <Header
        title="Gestão SSMA"
        subtitle={
          loading
            ? 'Carregando indicadores…'
            : `${stats.total} registro${stats.total !== 1 ? 's' : ''} · visão gerencial`
        }
        typeVisual={{
          Icon: LayoutDashboard,
          color: '#FF8A45',
          colorSoft: '#FFF4EC',
          gradient: 'linear-gradient(145deg, #FFB074 0%, #F07830 100%)',
          shadow: 'rgba(240, 120, 48, 0.28)',
        }}
      />

      <div className="gestao-toolbar">
        <div className="gestao-filters">
          <div className="gestao-filter-group">
            <Filter size={14} className="gestao-filter-ico" />
            <select
              className="gestao-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Período"
            >
              {PERIODS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <select
            className="gestao-select"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            aria-label="Tipo"
          >
            <option value="todos">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k, lab]) => (
              <option key={k} value={k}>
                {lab}
              </option>
            ))}
          </select>
          <select
            className="gestao-select"
            value={filterCanal}
            onChange={(e) => setFilterCanal(e.target.value)}
            aria-label="Canal"
          >
            <option value="todos">Todos os canais</option>
            <option value="app">App</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="radio">Rádio</option>
          </select>
          <select
            className="gestao-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Status"
          >
            <option value="todos">Todos os status</option>
            {STATUS_LIST.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="gestao-actions">
          <button type="button" className="gestao-btn gestao-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'gestao-spin' : ''} />
            Atualizar
          </button>
          <button type="button" className="gestao-btn gestao-btn--primary" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      <main className="gestao-main">
        {error ? (
          <div className="gestao-error">
            <AlertTriangle size={20} />
            <div>
              <strong>Erro ao carregar</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {/* KPI cards */}
        <section className="gestao-kpis" aria-label="Indicadores">
          {kpis.map(({ label, value, hint, color, Icon }) => (
            <article key={label} className="gestao-kpi" style={{ '--kpi-color': color }}>
              <div className="gestao-kpi__icon">
                <Icon size={18} />
              </div>
              <div className="gestao-kpi__body">
                <p className="gestao-kpi__label">{label}</p>
                <p className="gestao-kpi__value">{loading ? '—' : value}</p>
                <p className="gestao-kpi__hint">{hint}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Gauges + mini status */}
        <section className="gestao-row gestao-row--gauges">
          <article className="gestao-card gestao-card--gauge">
            <h3 className="gestao-card__title">Índice de atenção</h3>
            <p className="gestao-card__sub">Combina gravidade alta e relatos em aberto</p>
            <div className="gestao-gauge-wrap">
              <Gauge
                value={loading ? 0 : stats.riskScore}
                label="Atenção"
                sublabel={
                  stats.riskScore < 35
                    ? 'Situação controlada'
                    : stats.riskScore < 65
                      ? 'Monitorar'
                      : 'Priorizar tratativas'
                }
                size={180}
              />
            </div>
          </article>

          <article className="gestao-card gestao-card--gauge">
            <h3 className="gestao-card__title">Taxa de tratativa</h3>
            <p className="gestao-card__sub">% tratado ou fechado no filtro</p>
            <div className="gestao-gauge-wrap">
              <Gauge
                value={loading ? 0 : stats.treatRate}
                label="Tratados"
                sublabel={`${stats.closed} de ${stats.total || 0}`}
                size={180}
                colorLow="#E53935"
                colorMid="#FB8C00"
                colorHigh="#43A047"
              />
            </div>
          </article>

          <article className="gestao-card gestao-status-grid">
            <h3 className="gestao-card__title">Por status</h3>
            <p className="gestao-card__sub">Clique no filtro acima para focar</p>
            <ul className="gestao-status-list">
              {STATUS_LIST.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`gestao-status-item ${filterStatus === s.key ? 'is-active' : ''}`}
                    onClick={() =>
                      setFilterStatus(filterStatus === s.key ? 'todos' : s.key)
                    }
                  >
                    <span className="gestao-status-dot" style={{ background: s.color }} />
                    <span className="gestao-status-name">{s.label}</span>
                    <strong>{loading ? '—' : stats.byStatus[s.key] || 0}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Charts */}
        <section className="gestao-row gestao-row--charts">
          <article className="gestao-card gestao-card--chart">
            <h3 className="gestao-card__title">Relatos por dia</h3>
            <p className="gestao-card__sub">Últimos 7 dias (Brasília)</p>
            <div className="gestao-chart">
              {loading ? (
                <div className="gestao-chart-empty">Carregando…</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.dayBars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B939E' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8B939E' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Relatos" fill="#FF8A45" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="gestao-card gestao-card--chart">
            <h3 className="gestao-card__title">Por tipo de módulo</h3>
            <p className="gestao-card__sub">Distribuição dos relatos</p>
            <div className="gestao-chart">
              {!loading && stats.tipoBars.length === 0 ? (
                <div className="gestao-chart-empty">Sem dados no filtro</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stats.tipoBars}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#8B939E' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fontSize: 11, fill: '#4A5568' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Qtd" radius={[0, 8, 8, 0]} maxBarSize={22}>
                      {stats.tipoBars.map((e) => (
                        <Cell key={e.key} fill={e.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
        </section>

        <section className="gestao-row gestao-row--pies">
          <article className="gestao-card gestao-card--chart">
            <h3 className="gestao-card__title">Por canal</h3>
            <p className="gestao-card__sub">App · WhatsApp · Rádio</p>
            <div className="gestao-chart gestao-chart--pie">
              {!loading && stats.canalPie.length === 0 ? (
                <div className="gestao-chart-empty">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.canalPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {stats.canalPie.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="gestao-card gestao-card--chart">
            <h3 className="gestao-card__title">Gravidade / criticidade</h3>
            <p className="gestao-card__sub">Quando o campo foi informado</p>
            <div className="gestao-chart gestao-chart--pie">
              {!loading && stats.gravPie.length === 0 ? (
                <div className="gestao-chart-empty">Sem gravidade nos dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.gravPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {stats.gravPie.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="gestao-card">
            <h3 className="gestao-card__title">Top locais</h3>
            <p className="gestao-card__sub">Onde mais há relatos</p>
            {stats.topLocais.length === 0 ? (
              <div className="gestao-chart-empty">Sem locais no filtro</div>
            ) : (
              <ul className="gestao-rank">
                {stats.topLocais.map((item, i) => (
                  <li key={item.name}>
                    <span className="gestao-rank__n">{i + 1}</span>
                    <span className="gestao-rank__name" title={item.name}>
                      {item.name}
                    </span>
                    <span className="gestao-rank__bar-wrap">
                      <span
                        className="gestao-rank__bar"
                        style={{
                          width: `${Math.max(8, (item.value / (stats.topLocais[0]?.value || 1)) * 100)}%`,
                        }}
                      />
                    </span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        {/* Reports table */}
        <section className="gestao-card gestao-reports">
          <div className="gestao-reports__head">
            <div>
              <h3 className="gestao-card__title">Relatórios recentes</h3>
              <p className="gestao-card__sub">
                Atualize o status da tratativa · {reportRows.length} exibidos
              </p>
            </div>
            <button
              type="button"
              className="gestao-btn gestao-btn--ghost"
              onClick={() => navigate('/registros')}
            >
              Ver todos
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Desktop table */}
          <div className="gestao-table-wrap">
            <table className="gestao-table">
              <thead>
                <tr>
                  <th>Nº / Data</th>
                  <th>Tipo</th>
                  <th>Canal</th>
                  <th>Local</th>
                  <th>Grav.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="gestao-table-empty">
                      Carregando…
                    </td>
                  </tr>
                ) : reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="gestao-table-empty">
                      Nenhum registro no filtro
                    </td>
                  </tr>
                ) : (
                  reportRows.map((r) => {
                    const st = getStatus(r)
                    const g = getGravidade(r)
                    const num = r.numero || r.dados?._numero || '—'
                    const tipo = TIPO_LABELS[r.tipo] || r.tipo
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="gestao-td-main">{num}</div>
                          <div className="gestao-td-sub">{fmtDate(r.created_at)}</div>
                        </td>
                        <td>{tipo}</td>
                        <td>
                          <span className={`gestao-chip gestao-chip--${getCanal(r)}`}>
                            {canalLabel(getCanal(r))}
                          </span>
                        </td>
                        <td className="gestao-td-clip" title={getLocal(r)}>
                          {getLocal(r)}
                        </td>
                        <td>
                          {g ? (
                            <span className="gestao-badge">{g}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <select
                            className="gestao-select gestao-select--sm"
                            value={st.key}
                            disabled={updatingId === r.id}
                            onChange={(e) => updateStatus(r, e.target.value)}
                            style={{ borderColor: st.color + '55', color: st.color }}
                          >
                            {STATUS_LIST.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="gestao-report-cards">
            {loading ? (
              <p className="gestao-table-empty">Carregando…</p>
            ) : reportRows.length === 0 ? (
              <p className="gestao-table-empty">Nenhum registro no filtro</p>
            ) : (
              reportRows.map((r) => {
                const st = getStatus(r)
                const g = getGravidade(r)
                const num = r.numero || r.dados?._numero || '—'
                return (
                  <article key={r.id} className="gestao-report-card">
                    <div className="gestao-report-card__top">
                      <strong>{num}</strong>
                      <span className={`gestao-chip gestao-chip--${getCanal(r)}`}>
                        {canalLabel(getCanal(r))}
                      </span>
                    </div>
                    <p className="gestao-report-card__tipo">
                      {TIPO_LABELS[r.tipo] || r.tipo}
                      {g ? ` · ${g}` : ''}
                    </p>
                    <p className="gestao-report-card__local">{getLocal(r)}</p>
                    <p className="gestao-td-sub">{fmtDate(r.created_at)}</p>
                    <label className="gestao-report-card__status">
                      <span>Status</span>
                      <select
                        className="gestao-select gestao-select--sm"
                        value={st.key}
                        disabled={updatingId === r.id}
                        onChange={(e) => updateStatus(r, e.target.value)}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
