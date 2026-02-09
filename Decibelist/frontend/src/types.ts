export type SummaryItem = {
  label: string
  value: string
}

export type MetricRow = {
  name: string
  original: string
  mastered: string
}

export type MasteringJob = {
  id: string
  status: string
  createdAt: string
  inputPath?: string
  inputUrl?: string
  outputPath?: string
  outputUrl?: string
}
