package main

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"sync"
)

type ExecRequest struct {
	Path    string
	Args    []string
	WorkDir string
}

type ExecProgress struct {
	Line    string
	Percent float64
}

func RunWithProgress(ctx context.Context, req ExecRequest, onProgress func(ExecProgress)) error {
	if req.Path == "" {
		return fmt.Errorf("exec path is required")
	}

	cmd := exec.CommandContext(ctx, req.Path, req.Args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	wg.Add(2)

	readPipe := func(scanner *bufio.Scanner) {
		defer wg.Done()
		for scanner.Scan() {
			line := scanner.Text()
			onProgress(ExecProgress{Line: line, Percent: parsePercent(line)})
		}
	}

	go readPipe(bufio.NewScanner(stdout))
	go readPipe(bufio.NewScanner(stderr))

	wg.Wait()
	return cmd.Wait()
}

func parsePercent(line string) float64 {
	var percent float64
	_, _ = fmt.Sscanf(line, "%f%%", &percent)
	return percent
}

func RunAndCapture(ctx context.Context, req ExecRequest) (string, error) {
	if req.Path == "" {
		return "", fmt.Errorf("exec path is required")
	}
	cmd := exec.CommandContext(ctx, req.Path, req.Args...)
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}
	output, err := cmd.CombinedOutput()
	return string(output), err
}
