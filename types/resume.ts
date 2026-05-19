export interface Resume {
  id: string
  original_filename: string
  raw_text: string | null
  parsed_name?: string | null
  target_job?: string | null
  last_match_score?: number | null
  last_match_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ResumeWithScore extends Resume {
  /** 用于卡片展示的岗位标签 */
  target_position?: string
  /** @deprecated 使用 last_match_score */
  highest_match_score?: number
  /** @deprecated 使用 last_match_at */
  last_match_date?: string | null
}

export type JobDescriptionRecord = {
  id: string
  job_title: string
  full_text: string
  created_at: string
}

export type ResumeListItem = Resume & {
  has_pdf?: boolean
}
