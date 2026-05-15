package main

import (
	"context"
	"fmt"
	"net/http"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type googleServices struct {
	gmail *gmail.Service
	drive *drive.Service
}

func newGoogleServices(ctx context.Context, scopes []string) (*googleServices, error) {
	client, err := google.DefaultClient(ctx, scopes...)
	if err != nil {
		return nil, fmt.Errorf("google credentials unavailable: %w", err)
	}
	return newServicesFromHTTPClient(ctx, client)
}

func newServicesFromHTTPClient(ctx context.Context, client *http.Client) (*googleServices, error) {
	gmailService, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("create Gmail service: %w", err)
	}
	driveService, err := drive.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("create Drive service: %w", err)
	}
	return &googleServices{gmail: gmailService, drive: driveService}, nil
}
