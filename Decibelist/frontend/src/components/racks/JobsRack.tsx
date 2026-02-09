import { MasteringJob } from '../../types'
import { classNames } from '../../utils/classNames'

export function JobsRack({
  jobs,
  activeJobId,
  onLoadJob,
}: {
  jobs: MasteringJob[]
  activeJobId: string
  onLoadJob: (job: MasteringJob) => void
}) {
  return (
    <section className="module grid gap-6 p-8">
      <div className="module-title">Jobs</div>
      {jobs.length === 0 ? (
        <p className="text-sm text-slate-400">No jobs yet. Start a mastering run to populate this rack.</p>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={classNames('job-card', job.id === activeJobId && 'job-card-active')}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Job {job.id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-400">{job.createdAt}</p>
                </div>
                <span className="segment text-xs">{job.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="truncate text-xs text-slate-400">{job.inputPath || 'Input unavailable'}</p>
                <button
                  className="metal-button"
                  onClick={() => onLoadJob(job)}
                  disabled={!job.inputUrl || !job.outputUrl}
                  type="button"
                >
                  Load & Listen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
