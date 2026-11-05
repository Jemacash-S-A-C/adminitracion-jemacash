import { api } from '../utils/api'
import type { Evaluation, Guarantee, LoanApplication, LoanDocument, Payment, Signature, UserProfile } from '../types/api.types'
export type StaffUser = Pick<UserProfile, 'id' | 'full_name' | 'email' | 'phone' | 'role' | 'created_at'>
export type Installment = { number: number; amount: number; paid: number; balance: number; due: string | null; status: string }
export type AdminApplication = LoanApplication & { principal: number; paid: number; balance: number; schedule: Installment[] }
export type Snapshot = { users: StaffUser[]; applications: AdminApplication[]; payments: Payment[]; guarantees: Guarantee[] }
export type Detail = { app: LoanApplication; evaluation: Evaluation | null; documents: LoanDocument[]; signature: Signature | null;
  history: { id: string; actor_name: string; action: string; notes: string; created_at: string }[] }
export type ReviewAction = 'claim' | 'release' | 'approve' | 'reject' | 'collect'
export const adminApi = {
  snapshot: () => api.get<Snapshot>('/admin/snapshot'),
  detail: (id: string) => api.get<Detail>(`/admin/applications/${id}`),
  action: (id: string, action: ReviewAction, notes: string) => api.post(`/admin/applications/${id}/action`, { action, notes }),
  document: (id: string) => api.get<LoanDocument & { content_base64: string }>(`/admin/documents/${id}`),
}
