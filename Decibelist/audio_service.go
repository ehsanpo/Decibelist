package main

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type AudioService struct {
	app     *application.App
	mu      sync.Mutex
	jobs    map[string]*MasteringJob
	cancels map[string]context.CancelFunc
	mediaMu      sync.RWMutex
	mediaByToken map[string]string
	mediaByPath  map[string]string
}

func NewAudioService() *AudioService {
	return &AudioService{
		jobs:         map[string]*MasteringJob{},
		cancels:      map[string]context.CancelFunc{},
		mediaByToken: map[string]string{},
		mediaByPath:  map[string]string{},
	}
}

func (s *AudioService) SetApp(app *application.App) {
	s.app = app
}

func (s *AudioService) StartMastering(req MasteringRequest) (string, error) {
	if req.InputPath == "" {
		return "", errors.New("input path is required")
	}
	if req.Engine == "" {
		req.Engine = EngineHybrid
	}

	jobID := uuid.NewString()
	now := time.Now().Format(time.RFC3339)
	job := &MasteringJob{
		ID:        jobID,
		Status:    "running",
		Progress:  0,
		Message:   "Queued",
		InputPath: req.InputPath,
		StartedAt: now,
	}

	ctx, cancel := context.WithCancel(context.Background())

	s.mu.Lock()
	s.jobs[jobID] = job
	s.cancels[jobID] = cancel
	s.mu.Unlock()

	s.emitProgress(jobID, 0, "Queued")
	go s.runJob(ctx, jobID, req)

	return jobID, nil
}

func (s *AudioService) CancelJob(jobID string) bool {
	s.mu.Lock()
	cancel, ok := s.cancels[jobID]
	_, exists := s.jobs[jobID]
	s.mu.Unlock()

	if !ok || !exists {
		return false
	}
	cancel()
	s.updateJob(jobID, func(j *MasteringJob) {
		j.Status = "cancelled"
		j.Message = "Cancelled"
		j.CompletedAt = time.Now().Format(time.RFC3339)
	})
	return true
}

func (s *AudioService) GetJob(jobID string) (*MasteringJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[jobID]
	if !ok {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}
	copy := *job
	return &copy, nil
}

func (s *AudioService) ListJobs() []*MasteringJob {
	s.mu.Lock()
	defer s.mu.Unlock()
	jobs := make([]*MasteringJob, 0, len(s.jobs))
	for _, job := range s.jobs {
		copy := *job
		jobs = append(jobs, &copy)
	}
	return jobs
}

func (s *AudioService) GetDemoMetrics() []Metric {
	return []Metric{}
}

func (s *AudioService) GetDemoSummary() []SummaryItem {
	return []SummaryItem{}
}

func (s *AudioService) ExportFile(sourcePath, destinationPath string) error {
	if sourcePath == "" || destinationPath == "" {
		return errors.New("source and destination paths are required")
	}
	return copyFile(sourcePath, destinationPath)
}

func (s *AudioService) ExportReport(jobID, destinationPath string) error {
	job, err := s.GetJob(jobID)
	if err != nil {
		return err
	}
	if job.Result == nil {
		return errors.New("job has no result")
	}
	if destinationPath == "" {
		destinationPath = "summary_report.json"
	}
	report := newReport(job, job.InputPath)
	return WriteSummaryReport(destinationPath, report)
}

func (s *AudioService) runJob(ctx context.Context, jobID string, req MasteringRequest) {
	result, err := s.runEnginePipeline(ctx, jobID, req)
	if err != nil {
		s.updateJob(jobID, func(j *MasteringJob) {
			j.Status = "failed"
			j.Message = "Failed"
			j.Error = err.Error()
			j.CompletedAt = time.Now().Format(time.RFC3339)
		})
		s.emitEvent("mastering:error", jobID)
		return
	}

	s.updateJob(jobID, func(j *MasteringJob) {
		j.Status = "succeeded"
		j.Progress = 100
		j.Message = "Complete"
		j.Result = result
		j.CompletedAt = time.Now().Format(time.RFC3339)
	})
	s.emitEvent("mastering:complete", jobID)
}

func (s *AudioService) emitProgress(jobID string, percent float64, message string) {
	s.updateJob(jobID, func(j *MasteringJob) {
		j.Progress = percent
		j.Message = message
	})
	if s.app == nil {
		return
	}
	s.app.Event.Emit("mastering:progress", ProgressEvent{
		JobID:   jobID,
		Percent: percent,
		Message: message,
	})
}

func (s *AudioService) emitEvent(name string, jobID string) {
	if s.app == nil {
		return
	}
	job, err := s.GetJob(jobID)
	if err != nil {
		return
	}
	s.app.Event.Emit(name, *job)
}

func (s *AudioService) updateJob(jobID string, update func(job *MasteringJob)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[jobID]
	if !ok {
		return
	}
	update(job)
}
