package main

type MasteringEngine string

const (
	EngineHybrid  MasteringEngine = "hybrid"
	EngineClassic MasteringEngine = "classic"
)

type MasteringRequest struct {
	InputPath string          `json:"inputPath"`
	OutputDir string          `json:"outputDir"`
	Engine    MasteringEngine `json:"engine"`
	Options   MasteringOptions `json:"options"`
}

type MasteringOptions struct {
	TargetLoudnessMode string  `json:"targetLoudnessMode"`
	TargetLoudness     float64 `json:"targetLoudness"`
	CeilingMode        string  `json:"ceilingMode"`
	Ceiling            float64 `json:"ceiling"`
	Oversampling       string  `json:"oversampling"`
	AutomaticMastering bool    `json:"automaticMastering"`
	AutomaticLevel     float64 `json:"automaticLevel"`
	OutputFormat       string  `json:"outputFormat"`
	SampleRate         string  `json:"sampleRate"`
	LowCutHz           float64 `json:"lowCutHz"`
	HighCutHz          float64 `json:"highCutHz"`

}

type MasteringJob struct {
	ID          string           `json:"id"`
	Status      string           `json:"status"`
	Progress    float64          `json:"progress"`
	Message     string           `json:"message"`
	Error       string           `json:"error"`
	InputPath   string           `json:"inputPath"`
	StartedAt   string           `json:"startedAt"`
	CompletedAt string           `json:"completedAt"`
	Result      *MasteringResult `json:"result,omitempty"`
}

type MasteringResult struct {
	OutputPath  string            `json:"outputPath"`
	Summary     []SummaryItem     `json:"summary"`
	Metrics     []Metric          `json:"metrics"`
	Warnings    []string          `json:"warnings"`
	Diagnostics EngineDiagnostics `json:"diagnostics"`
}

type SummaryItem struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type Metric struct {
	Name            string `json:"name"`
	Original        string `json:"original"`
	Mastered        string `json:"mastered"`
	PercentOriginal int    `json:"percentOriginal"`
	PercentMastered int    `json:"percentMastered"`
}

type EngineDiagnostics struct {
	Engine    MasteringEngine  `json:"engine"`
	Binaries  map[string]bool  `json:"binaries"`
	Simulated bool             `json:"simulated"`
	Notes     []string         `json:"notes"`
	Command   EngineCommand    `json:"command"`
}

type EngineCommand struct {
	Path string   `json:"path"`
	Args []string `json:"args"`
}

type ProgressEvent struct {
	JobID   string  `json:"jobId"`
	Percent float64 `json:"percent"`
	Message string  `json:"message"`
}

type NormalizationResult struct {
	BeforeLUFS    float64 `json:"beforeLUFS"`
	AfterLUFS     float64 `json:"afterLUFS"`
	GainApplied   float64 `json:"gainApplied"`
	TruePeak      float64 `json:"truePeak"`
	TruePeakTP    float64 `json:"truePeakTP"`
	LoudnessRange float64 `json:"loudnessRange"`
}
