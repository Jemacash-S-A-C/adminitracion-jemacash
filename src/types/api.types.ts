// ── Backend response shapes ───────────────────────────────────────────────────

export type UserProfile = {
  role: 'member' | 'moderator' | 'admin'
  id: string
  full_name: string
  email: string
  phone: string | null
  has_google: boolean
  initials: string
  created_at: string
  notification_email: boolean
  pref_currency: string
  pref_language: string
  pref_timezone: string
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
  user: UserProfile
}

export type LoanApplication = {
  reviewer_id?: string | null
  review_notes?: string | null
  reviewed_at?: string | null
  id: string
  user_id: string
  guarantee_id: string | null
  guarantee?: Guarantee | null   // populated when fetched via findAll
  amount: number
  term_months: number
  status: 'draft' | 'submitted' | 'signed' | 'approved' | 'disbursed' | 'defaulted' | 'cancelled' | 'rejected'
  disbursed_at: string | null
  commission_amount?: number | string
  paid_off_at?: string | null
  pickup_accepted_at?: string | null
  collected_at?: string | null
  created_at: string
  updated_at: string
}

export type Evaluation = {
  id: string
  application_id: string
  status: 'pending' | 'approved' | 'rejected'
  approved_amount: number | null
  risk_score: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type GuaranteeSpecs = {
  is_reconditioned?: string
  mileage?: string
  fuel?: string
  transmission?: string
  engine?: string
  color?: string
  processor?: string
  ram?: string
  storage?: string
  battery_health?: string
  screen_size?: string
  os_name?: string
  os_version?: string
  cpu_name?: string
  gpu_name?: string
  motherboard?: string
  total_ram_gb?: string
  primary_disk?: string
  primary_disk_size_gb?: string
  audit_verified?: string
  audit_source?: string
  audit_completed_at?: string
  audit_discrepancy?: string
  audit_discrepancy_notes?: string
}

export type AiValuationResult = {
  condition_score: number
  market_value_pen: number
  resale_value_pen: number
  max_loan_pen: number
  depreciation_factors: string[]
  confidence: number
  reasoning: string
  visual_condition: string
  device_match_valid: boolean
  match_rejection_reason?: string
}

export type Guarantee = {
  id: string
  user_id: string
  type: string
  name: string
  description: string | null
  estimated_value: number
  status: 'pending_evaluation' | 'active' | 'pledged' | 'released' | 'seized'
  created_at: string
  // Technology-specific (present when type === 'tecnologia')
  device_category?: string | null
  brand?: string | null
  model?: string | null
  manufacture_year?: string | null
  serial_number?: string | null
  condition?: string | null
  specs?: GuaranteeSpecs | null
  photo_urls?: string[] | null
  // AI valuation fields
  ai_market_value?: number | null
  ai_resale_value?: number | null
  ai_max_loan?: number | null
  ai_condition_score?: number | null
  ai_depreciation_factors?: string[] | null
  ai_confidence?: number | null
  ai_reasoning?: string | null
  ai_visual_condition?: string | null
}

export type PaymentMethod = 'bcp' | 'bbva' | 'yape' | 'plin' | 'efectivo' | 'mercadopago'

export type Payment = {
  id: string
  application_id: string
  user_id: string
  amount: number
  payment_method: PaymentMethod
  status: 'completed' | 'failed'
  cuota_number: number
  reference_number: string
  created_at: string
}

export type DocumentType =
  | 'dni' | 'passport' | 'pay_stub' | 'utility_bill' | 'soat' | 'vehicle_card' | 'other'

export type DocumentStatus = 'pending' | 'reviewing' | 'verified' | 'rejected'

export type LoanDocument = {
  id: string
  user_id: string
  application_id: string | null
  document_type: DocumentType
  original_name: string
  file_size: number
  mime_type: string
  status: DocumentStatus
  notes: string | null
  created_at: string
}

export type Signature = {
  id: string
  application_id: string
  signature_base64: string
  document_urls: string[] | null
  created_at: string
}

// ── Frontend session shape (mirrors DemoSession for minimal diff) ─────────────

export type UserSession = {
  id: string
  displayName: string   // = full_name
  email: string
  phone: string | null
  initials: string
  role: string          // always 'Miembro'
  identifier: string    // = email
}

export function profileToSession(profile: UserProfile): UserSession {
  return {
    id: profile.id,
    displayName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    initials: profile.initials,
    role: profile.role ?? 'member',
    identifier: profile.email,
  }
}
