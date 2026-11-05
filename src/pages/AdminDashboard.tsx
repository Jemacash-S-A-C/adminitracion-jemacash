import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeft, ArrowUpRight, Check, ClipboardList, Download, FileText, Landmark, LogOut, RefreshCw, Search, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { adminApi, type Detail, type ReviewAction, type Snapshot } from '../services/admin.service'
import type { UserSession } from '../types/api.types'
import { subscribeLive } from '../utils/live'
import logo from '../assets/partner_logos/jemacashlogo.png'
import './AdminDashboard.css'

const money = (v: number | string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(v))
const date = (v: string | null) => v ? new Date(v).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin programar'
const code = (id: string) => `JM-${id.slice(0, 6).toUpperCase()}`
const labels: Record<string, string> = { draft: 'Borrador', submitted: 'En preparación', signed: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada', disbursed: 'Desembolsada', defaulted: 'En incumplimiento', cancelled: 'Cancelada', paid: 'Pagada', pending: 'Pendiente', overdue: 'Vencida', unscheduled: 'Sin programar', completed: 'Confirmado', failed: 'Fallido', active: 'Disponible', pledged: 'En garantía', seized: 'Incautada', released: 'Liberada', pending_evaluation: 'Por evaluar', member: 'Cliente', moderator: 'Moderador', admin: 'Administrador', claim: 'Tomó la solicitud', release: 'Liberó la asignación', approve: 'Aprobó', reject: 'Rechazó', disburse: 'Registró el desembolso' }
labels.collect = 'Confirmó la recogida y activó el crédito'
labels.disbursed = 'Crédito activo'
const Badge = ({ status }: { status: string }) => <span className={`adm-badge adm-${status}`}>{labels[status] ?? status}</span>
const tabs = [{ id: 'requests', label: 'Solicitudes', icon: ClipboardList }, { id: 'loans', label: 'Préstamos y cuotas', icon: Landmark }, { id: 'payments', label: 'Pagos', icon: Wallet }, { id: 'users', label: 'Clientes', icon: Users }, { id: 'team', label: 'Equipo', icon: ShieldCheck }, { id: 'guarantees', label: 'Garantías', icon: ShieldCheck }] as const
type Tab = typeof tabs[number]['id']

export default function AdminDashboard({ user, onLogout }: { user: UserSession; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('requests')
  const [data, setData] = useState<Snapshot | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('signed')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState<ReviewAction | null>(null)
  const [updated, setUpdated] = useState<string | null>(null)
  const requestVersion = useRef(0)
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    try {
      const next = await adminApi.snapshot()
      if (version === requestVersion.current) { setData(next); setUpdated(new Date().toISOString()); setError('') }
    } catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : 'No se pudo actualizar el panel.') }
  }, [])
  useEffect(() => { void refresh(); return subscribeLive(() => { void refresh() }, setConnected) }, [refresh])
  useEffect(() => {
    let active = true
    if (!selected) { setDetail(null); return }
    adminApi.detail(selected).then(d => { if (active) setDetail(d) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [selected, data])
  useEffect(() => { setPage(0) }, [query, status, tab])
  useEffect(() => { setNotes(''); setConfirm(null); setDetail(null) }, [selected])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirm(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const person = (id: string) => data?.users.find(u => u.id === id)
  const matches = (...values: (string | undefined | null)[]) => values.join(' ').toLowerCase().includes(query.toLowerCase())
  const apps = data?.applications ?? []
  const queue = apps.filter(a => a.status === 'signed')
  const loans = apps.filter(a => ['disbursed', 'defaulted'].includes(a.status))
  const overdue = loans.reduce((sum, a) => sum + a.schedule.filter(q => q.status === 'overdue').reduce((s, q) => s + q.balance, 0), 0)
  const current = apps.find(a => a.id === selected)
  const filteredApps = apps.filter(a => (tab !== 'loans' || ['approved', 'disbursed', 'defaulted'].includes(a.status)) && (status === 'all' || a.status === status) && matches(code(a.id), person(a.user_id)?.full_name, person(a.user_id)?.email))
  const filteredPayments = (data?.payments ?? []).filter(p => (status === 'all' || p.status === status) && matches(person(p.user_id)?.full_name, person(p.user_id)?.email, p.reference_number, code(p.application_id)))
  const filteredUsers = (data?.users ?? []).filter(u => (tab === 'team' ? ['admin', 'moderator'].includes(u.role) : u.role === 'member') && (status === 'all' || u.role === status) && matches(u.full_name, u.email))
  const filteredGuarantees = (data?.guarantees ?? []).filter(g => (status === 'all' || g.status === status) && matches(g.name, person(g.user_id)?.full_name, person(g.user_id)?.email))
  const rows = tab === 'payments' ? filteredPayments : tab === 'users' || tab === 'team' ? filteredUsers : tab === 'guarantees' ? filteredGuarantees : filteredApps
  const pages = Math.max(1, Math.ceil(rows.length / 12))
  const safePage = Math.min(page, pages - 1)
  const visible = <T,>(items: T[]) => items.slice(safePage * 12, safePage * 12 + 12)
  function navigate(next: Tab) { setTab(next); setSelected(null); setQuery(''); setStatus(next === 'requests' ? 'signed' : 'all') }
  async function perform(action: ReviewAction) {
    if (!selected) return
    setBusy(true); setError('')
    try { await adminApi.action(selected, action, notes); setConfirm(null); setNotes(''); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.') }
    finally { setBusy(false) }
  }
  async function download(id: string) {
    try {
      const doc = await adminApi.document(id)
      const raw = atob(doc.content_base64.includes(',') ? doc.content_base64.split(',')[1] : doc.content_base64)
      const url = URL.createObjectURL(new Blob([Uint8Array.from(raw, c => c.charCodeAt(0))], { type: 'application/octet-stream' }))
      const link = document.createElement('a'); link.href = url; link.download = doc.original_name; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo descargar.') }
  }
  const filters = tab === 'requests' ? ['signed', 'submitted', 'approved', 'rejected', 'draft', 'cancelled', 'disbursed', 'defaulted'] : tab === 'loans' ? ['approved', 'disbursed', 'defaulted'] : tab === 'payments' ? ['completed', 'failed'] : tab === 'users' ? ['member'] : tab === 'team' ? ['moderator', 'admin'] : ['active', 'pledged', 'pending_evaluation', 'released', 'seized']
  return <div className="adm-shell">
    <aside className="adm-sidebar">
      <div className="adm-brand"><img src={logo} alt="Jemacash" /><div><strong>Jemacash</strong><span>Administración</span></div></div>
      <nav aria-label="Administración">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => navigate(t.id)}><t.icon size={20} /><span>{t.label}</span>{t.id === 'requests' && queue.length > 0 && <b>{queue.length}</b>}</button>)}</nav>
      <div className="adm-account"><span className="adm-avatar">{user.initials}</span><div><strong>{user.displayName}</strong><small>{labels[user.role]}</small></div><button className="adm-icon" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={onLogout}><LogOut size={19} /></button></div>
    </aside>
    <main className="adm-main">
      <header className="adm-top"><div><span className="adm-eyebrow">CENTRO DE OPERACIONES</span><h1>{selected ? 'Expediente de solicitud' : tabs.find(t => t.id === tab)?.label}</h1></div><div className="adm-live"><i className={connected ? 'online' : ''} />{connected ? 'En vivo' : 'Reconectando'}<button className="adm-icon" title="Actualizar" aria-label="Actualizar" onClick={() => void refresh()}><RefreshCw size={18} /></button></div></header>
      {error && <div role="alert" className="adm-error">{error}<button className="adm-icon" title="Cerrar aviso" onClick={() => setError('')}><X size={18} /></button></div>}
      <section className="adm-metrics" aria-label="Resumen de cartera">
        <div><ClipboardList /><span>Por revisar</span><strong>{queue.length}</strong><small>{queue.filter(a => !a.reviewer_id).length} sin asignar</small></div>
        <div><Landmark /><span>Préstamos activos</span><strong>{loans.filter(a => a.balance > 0).length}</strong><small>{money(loans.reduce((s, a) => s + a.principal, 0))} de capital</small></div>
        <div><Wallet /><span>Saldo por cobrar</span><strong>{money(loans.reduce((s, a) => s + a.balance, 0))}</strong><small>Incluye intereses del cronograma</small></div>
        <div><Activity /><span>Cuotas vencidas</span><strong>{money(overdue)}</strong><small>{loans.reduce((s, a) => s + a.schedule.filter(q => q.status === 'overdue').length, 0)} cuotas por regularizar</small></div>
      </section>
      {!data ? <div className="adm-empty">{error ? 'No se pudieron cargar los datos.' : 'Cargando operaciones…'}<button onClick={() => void refresh()}>Reintentar</button></div> : selected ? <>
        <button className="adm-back" onClick={() => setSelected(null)}><ArrowLeft size={17} /> Volver a la lista</button>
        {!detail || !current ? <div className="adm-empty">Cargando expediente…</div> : <div className="adm-detail">
          <div className="adm-record">
            <div className="adm-section-head"><div><h2>{code(current.id)}</h2><span>{date(current.created_at)}</span></div><Badge status={current.status} /></div>
            <section><h3>Solicitante</h3><dl><div><dt>Nombre</dt><dd>{person(current.user_id)?.full_name}</dd></div><div><dt>Correo</dt><dd>{person(current.user_id)?.email}</dd></div><div><dt>Teléfono</dt><dd>{person(current.user_id)?.phone || 'No registrado'}</dd></div><div><dt>Importe solicitado</dt><dd>{money(current.amount)} · {current.term_months} meses</dd></div></dl></section>
            <section><h3>Garantía y valuación</h3>{detail.app.guarantee ? <><dl><div><dt>Equipo</dt><dd>{detail.app.guarantee.name}</dd></div><div><dt>Estado</dt><dd><Badge status={detail.app.guarantee.status} /></dd></div><div><dt>Valor estimado</dt><dd>{money(detail.app.guarantee.estimated_value)}</dd></div><div><dt>Tope estimado por IA</dt><dd>{detail.app.guarantee.ai_max_loan != null ? money(detail.app.guarantee.ai_max_loan) : 'Sin valuación'}</dd></div></dl><p>{detail.app.guarantee.ai_reasoning || 'Sin observaciones de IA.'}</p><div className="adm-photos">{(detail.app.guarantee.photo_urls ?? []).filter(src => /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(src)).map((src, i) => <img key={i} src={src} alt={`Garantía, foto ${i + 1}`} />)}</div><dl>{Object.entries(detail.app.guarantee.specs ?? {}).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl></> : <p>No hay garantía vinculada.</p>}</section>
            <section><h3>Documentos y firma</h3>{detail.documents.length === 0 && <p>Sin documentos adjuntos.</p>}<div className="adm-docs">{detail.documents.map(d => <button key={d.id} onClick={() => void download(d.id)}><FileText size={18} /><span>{d.original_name}<small>{d.document_type}</small></span><Download size={17} /></button>)}</div>{detail.signature ? <figure className="adm-signature"><img src={detail.signature.signature_base64} alt="Firma del solicitante" /><figcaption>Firmado el {date(detail.signature.created_at)}</figcaption></figure> : <p>Firma pendiente.</p>}</section>
            <section><h3>Cronograma de cuotas</h3><div className="adm-table-wrap"><table><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Importe</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>{current.schedule.map(q => <tr key={q.number}><td>{q.number}</td><td>{date(q.due)}</td><td>{money(q.amount)}</td><td>{money(q.paid)}</td><td>{money(q.balance)}</td><td><Badge status={q.status} /></td></tr>)}</tbody></table></div></section>
            <section><h3>Pagos registrados</h3>{data.payments.filter(p => p.application_id === current.id).map(p => <div className="adm-history" key={p.id}><Wallet size={18} /><div><strong>Cuota {p.cuota_number} · {money(p.amount)}</strong><p>{p.reference_number} · {p.payment_method} · {date(p.created_at)}</p></div><Badge status={p.status} /></div>)}</section>
          </div>
          <aside className="adm-review"><h2>Revisión</h2><p>Responsable: <strong>{person(current.reviewer_id ?? '')?.full_name ?? 'Sin asignar'}</strong></p>
            {current.status === 'signed' && <>{(!current.reviewer_id || (user.role === 'admin' && current.reviewer_id !== user.id)) && <button className="adm-primary" disabled={busy || current.user_id === user.id} onClick={() => void perform('claim')}>Tomar solicitud</button>}{current.reviewer_id === user.id && <button disabled={busy} onClick={() => void perform('release')}>Liberar asignación</button>}</>}
            {['signed', 'approved'].includes(current.status) && current.reviewer_id && (current.reviewer_id === user.id || user.role === 'admin') && current.user_id !== user.id && <><label className="adm-note">{current.status === 'approved' ? 'Constancia de recogida y verificación física' : 'Motivo de la decisión'}<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} rows={5} placeholder="Registra la revisión realizada…" /></label>{current.status === 'signed' ? <div className="adm-decisions"><button className="adm-primary" disabled={busy || notes.trim().length < 5} onClick={() => setConfirm('approve')}><Check size={17} /> Aprobar</button><button className="adm-danger" disabled={busy || notes.trim().length < 5} onClick={() => setConfirm('reject')}><X size={17} /> Rechazar</button></div> : <button className="adm-primary" disabled={busy || notes.trim().length < 5} onClick={() => setConfirm('collect')}>Confirmar recogida y activar crédito</button>}</>}
            {current.collected_at && <div className="adm-decision-note"><strong>Dispositivo recogido · Crédito activo</strong><p>{new Date(current.collected_at).toLocaleString('es-PE')}</p></div>}
            {['approved', 'disbursed'].includes(current.status) && <div className="adm-decision-note"><strong>Recogida provisional</strong><p>{current.pickup_accepted_at ? `Aceptada por el cliente el ${new Date(current.pickup_accepted_at).toLocaleString('es-PE')}.` : 'No se ha registrado la aceptación del cliente.'}</p></div>}
            <p>Comisión total incluida en las cuotas: <strong>{money(Number(current.commission_amount ?? 0))}</strong></p>
            {current.review_notes && <div className="adm-decision-note"><strong>Decisión registrada</strong><p>{current.review_notes}</p></div>}
            <h3>Historial</h3>{detail.history.length === 0 && <p>Aún no hay intervenciones.</p>}{detail.history.map(h => <div className="adm-history" key={h.id}><span className="adm-history-dot" /><div><strong>{labels[h.action] ?? h.action}</strong><small>{h.actor_name} · {date(h.created_at)}</small>{h.notes && <p>{h.notes}</p>}</div></div>)}
          </aside>
        </div>}
      </> : <section className="adm-list">
        <div className="adm-toolbar"><label className="adm-search"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar por nombre, correo o referencia" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filtrar por estado o rol" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos</option>{filters.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select><span>{rows.length} registros</span></div>
        <div className="adm-table-wrap"><table><thead><tr>{(tab === 'payments' ? ['Referencia', 'Cliente', 'Solicitud / cuota', 'Fecha', 'Medio', 'Importe', 'Estado'] : tab === 'users' ? ['Cliente', 'Contacto', 'Préstamos activos', 'Saldo'] : tab === 'team' ? ['Trabajador', 'Contacto', 'Rol', 'Solicitudes asignadas'] : tab === 'guarantees' ? ['Garantía', 'Propietario', 'Tipo', 'Valor', 'Estado'] : ['Solicitud', 'Cliente', 'Importe', 'Plazo', tab === 'loans' ? 'Cuotas pagadas' : 'Responsable', 'Estado', '']).map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>
          {(tab === 'requests' || tab === 'loans') && visible(filteredApps).map(a => <tr key={a.id}><td><button className="adm-link" onClick={() => setSelected(a.id)}>{code(a.id)}</button><small>{date(a.created_at)}</small></td><td>{person(a.user_id)?.full_name}<small>{person(a.user_id)?.email}</small></td><td>{money(a.principal)}{tab === 'loans' && <small>Saldo {money(a.balance)}</small>}</td><td>{a.term_months} meses</td><td>{tab === 'loans' ? `${a.schedule.filter(q => q.status === 'paid').length} / ${a.term_months}` : person(a.reviewer_id ?? '')?.full_name ?? 'Sin asignar'}</td><td><Badge status={a.status} /></td><td><button className="adm-icon" title="Abrir expediente" aria-label={`Abrir ${code(a.id)}`} onClick={() => setSelected(a.id)}><ArrowUpRight size={19} /></button></td></tr>)}
          {tab === 'payments' && visible(filteredPayments).map(p => <tr key={p.id}><td>{p.reference_number}</td><td>{person(p.user_id)?.full_name}</td><td><button className="adm-link" onClick={() => setSelected(p.application_id)}>{code(p.application_id)} / {p.cuota_number}</button></td><td>{date(p.created_at)}</td><td>{p.payment_method}</td><td>{money(p.amount)}</td><td><Badge status={p.status} /></td></tr>)}
          {tab === 'users' && visible(filteredUsers).map(u => <tr key={u.id}><td><strong>{u.full_name}</strong><small>Desde {date(u.created_at)}</small></td><td>{u.email}<small>{u.phone || 'Sin teléfono'}</small></td><td>{loans.filter(a => a.user_id === u.id && a.balance > 0).length}</td><td>{money(loans.filter(a => a.user_id === u.id).reduce((s, a) => s + a.balance, 0))}</td></tr>)}
          {tab === 'team' && visible(filteredUsers).map(u => <tr key={u.id}><td><strong>{u.full_name}</strong><small>Desde {date(u.created_at)}</small></td><td>{u.email}<small>{u.phone || 'Sin teléfono'}</small></td><td><Badge status={u.role} /></td><td>{queue.filter(a => a.reviewer_id === u.id).length}</td></tr>)}
          {tab === 'guarantees' && visible(filteredGuarantees).map(g => <tr key={g.id}><td>{g.name}</td><td>{person(g.user_id)?.full_name}</td><td>{g.type}</td><td>{money(g.estimated_value)}</td><td><Badge status={g.status} /></td></tr>)}
        </tbody></table></div>
        {rows.length === 0 && <div className="adm-empty"><ClipboardList size={32} /><h3>No hay registros en esta vista</h3><p>{tab === 'requests' && status === 'signed' ? 'Las solicitudes aparecerán aquí cuando los clientes finalicen la firma.' : 'Prueba con otro estado o búsqueda.'}</p></div>}
        <footer className="adm-pagination"><span>Actualizado {updated ? new Date(updated).toLocaleTimeString('es-PE') : '—'}</span><div><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button><span>{safePage + 1} de {pages}</span><button disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)}>Siguiente</button></div></footer>
      </section>}
    </main>
    {confirm && <div className="adm-overlay"><div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="adm-confirm-title"><h2 id="adm-confirm-title">{confirm === 'approve' ? 'Aprobar solicitud' : confirm === 'reject' ? 'Rechazar solicitud' : 'Confirmar recogida y activar crédito'}</h2><p>{confirm === 'collect' ? 'Confirma que recogiste el dispositivo y completaste la verificación física. El crédito quedará activo y el cronograma de cuotas comenzará desde esta fecha. Esta acción no transfiere dinero a una cuenta bancaria.' : 'La decisión se notificará al cliente y quedará registrada con tu nombre.'}</p><blockquote>{notes}</blockquote><div className="adm-decisions"><button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button><button autoFocus className="adm-primary" disabled={busy} onClick={() => void perform(confirm)}>{busy ? 'Guardando…' : 'Confirmar'}</button></div></div></div>}
  </div>
}
