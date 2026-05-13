export interface Resume {
  id: string
  user_id: string
  file_url: string
  raw_text: string | null
  original_filename: string
  created_at: string
  updated_at?: string | null
  /** 岗位目标（若库表无此列则为 undefined） */
  target_job?: string | null
  /** 解析出的姓名（若库表无此列则为 undefined） */
  parsed_name?: string | null
}

export interface ResumeWithScore extends Resume {
  highest_match_score?: number
  /** 用于卡片展示的岗位标签（表字段或匹配 JD 标题，含兜底） */
  target_position?: string
  last_match_date?: string | null
}

export type JobDescriptionEmbed = {
  id: string
  job_title: string
  full_text: string
}

export interface MatchWithJobDescription {
  id: string
  resume_id: string
  jd_id: string
  match_score: number
  optimized_content: string
  suggestions: string[]
  created_at: string
  /** Supabase 嵌套查询可能返回对象或单元素数组 */
  job_descriptions: JobDescriptionEmbed | JobDescriptionEmbed[] | null
}

export interface ResumeWithDetails extends Resume {
  matches: MatchWithJobDescription[]
}