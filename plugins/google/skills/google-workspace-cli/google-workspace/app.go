package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
)

const (
	scopeGmailReadonly = "https://www.googleapis.com/auth/gmail.readonly"
	scopeGmailCompose  = "https://www.googleapis.com/auth/gmail.compose"
	scopeGmailModify   = "https://www.googleapis.com/auth/gmail.modify"
	scopeDriveReadonly = "https://www.googleapis.com/auth/drive.readonly"
	scopeDriveFile     = "https://www.googleapis.com/auth/drive.file"
)

var (
	gmailScopes = []string{scopeGmailReadonly, scopeGmailCompose, scopeGmailModify}
	driveScopes = []string{scopeDriveReadonly, scopeDriveFile}
	allScopes   = []string{scopeGmailReadonly, scopeGmailCompose, scopeGmailModify, scopeDriveReadonly, scopeDriveFile}
)

type app struct {
	stdout      io.Writer
	stderr      io.Writer
	newServices serviceFactory
}

type serviceFactory func(context.Context, []string) (*googleServices, error)

type jsonEnvelope struct {
	OK    bool           `json:"ok"`
	Data  any            `json:"data,omitempty"`
	Error *errorResponse `json:"error,omitempty"`
}

type errorResponse struct {
	Code    string   `json:"code"`
	Message string   `json:"message"`
	Hints   []string `json:"hints,omitempty"`
}

func newApp(stdout, stderr io.Writer, factory serviceFactory) *app {
	return &app{stdout: stdout, stderr: stderr, newServices: factory}
}

func (a *app) run(ctx context.Context, args []string) int {
	if len(args) == 0 || args[0] == "--help" || args[0] == "-h" || args[0] == "help" {
		a.writeUsage()
		return 0
	}

	switch args[0] {
	case "auth-check":
		return a.runAuthCheck(ctx, args[1:])
	case "gmail":
		return a.runGmail(ctx, args[1:])
	case "drive":
		return a.runDrive(ctx, args[1:])
	default:
		return a.fail("unknown_command", fmt.Errorf("unknown command %q", args[0]), []string{"Run with --help to see supported commands."})
	}
}

func (a *app) writeUsage() {
	fmt.Fprint(a.stdout, `Google Workspace CLI

Usage:
  google-workspace auth-check [--scopes all|gmail|drive|comma-separated-scopes]
  google-workspace gmail search --query <query> [--user me] [--max-results 10]
  google-workspace gmail thread --id <thread-id> [--user me] [--format metadata|full|minimal]
  google-workspace gmail labels [--user me]
  google-workspace gmail drafts [--user me] [--max-results 10]
  google-workspace gmail draft-create --to <email> --subject <subject> (--body <text>|--body-file <path>) [--user me]
  google-workspace gmail label-thread --thread-id <id> [--add-label <id>] [--remove-label <id>] [--user me]
  google-workspace drive search --query <query> [--max-results 10]
  google-workspace drive recent [--max-results 10]
  google-workspace drive metadata --id <file-id>
  google-workspace drive permissions --id <file-id>
  google-workspace drive download --id <file-id> --output <path>
  google-workspace drive export --id <file-id> --mime-type <type> --output <path>
  google-workspace drive create --name <name> --mime-type <type> --content-file <path> [--parent <folder-id>]
`)
}

func (a *app) runAuthCheck(ctx context.Context, args []string) int {
	fs := newFlagSet("auth-check")
	scopeText := fs.String("scopes", "all", "scope alias or comma-separated scopes")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	scopes := parseScopes(*scopeText)
	if len(scopes) == 0 {
		return a.fail("invalid_scopes", fmt.Errorf("no scopes resolved from %q", *scopeText), []string{"Use all, gmail, drive, or explicit Google OAuth scope URLs."})
	}

	if _, err := a.newServices(ctx, scopes); err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(scopes))
	}

	return a.writeOK(map[string]any{
		"authenticated":      true,
		"scopes":             scopes,
		"credential_source":  credentialSource(),
		"interactive_login":  false,
		"secret_persistence": "outside-repository",
	})
}

func parseScopes(input string) []string {
	parts := splitCSV(input)
	if len(parts) == 0 {
		return nil
	}

	var scopes []string
	for _, part := range parts {
		switch strings.ToLower(part) {
		case "all":
			scopes = append(scopes, allScopes...)
		case "gmail":
			scopes = append(scopes, gmailScopes...)
		case "gmail-readonly", "gmail.readonly":
			scopes = append(scopes, scopeGmailReadonly)
		case "gmail-compose", "gmail.compose":
			scopes = append(scopes, scopeGmailCompose)
		case "gmail-modify", "gmail.modify":
			scopes = append(scopes, scopeGmailModify)
		case "drive":
			scopes = append(scopes, driveScopes...)
		case "drive-readonly", "drive.readonly":
			scopes = append(scopes, scopeDriveReadonly)
		case "drive-file", "drive.file":
			scopes = append(scopes, scopeDriveFile)
		default:
			scopes = append(scopes, part)
		}
	}
	return dedupe(scopes)
}

func credentialSource() string {
	if os.Getenv("GOOGLE_APPLICATION_CREDENTIALS") != "" {
		return "GOOGLE_APPLICATION_CREDENTIALS"
	}
	return "application_default_credentials"
}

func authHints(scopes []string) []string {
	return []string{
		"Run gcloud auth application-default login with the required Google scopes.",
		"Enable gmail.googleapis.com and drive.googleapis.com before using this wrapper.",
		"Set GOOGLE_APPLICATION_CREDENTIALS only for an approved service-account or CI workflow.",
		"Do not store OAuth client secrets, service account keys, access tokens, or refresh tokens in this repository.",
		fmt.Sprintf("Required scopes: %s", strings.Join(scopes, ",")),
	}
}

func (a *app) writeOK(data any) int {
	if err := writeJSON(a.stdout, jsonEnvelope{OK: true, Data: data}); err != nil {
		fmt.Fprintf(a.stderr, "failed to write JSON output: %v\n", err)
		return 1
	}
	return 0
}

func (a *app) fail(code string, err error, hints []string) int {
	message := "unknown error"
	if err != nil {
		message = err.Error()
	}
	if writeErr := writeJSON(a.stdout, jsonEnvelope{
		OK: false,
		Error: &errorResponse{
			Code:    code,
			Message: redactString(message),
			Hints:   hints,
		},
	}); writeErr != nil {
		fmt.Fprintf(a.stderr, "failed to write JSON error: %v\n", writeErr)
	}
	return 1
}

func writeJSON(w io.Writer, value any) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}

func newFlagSet(name string) *flag.FlagSet {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	return fs
}

func requireFlag(name, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("missing required flag --%s", name)
	}
	return nil
}

func splitCSV(input string) []string {
	var values []string
	for _, value := range strings.Split(input, ",") {
		value = strings.TrimSpace(value)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func dedupe(values []string) []string {
	seen := map[string]struct{}{}
	var deduped []string
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		deduped = append(deduped, value)
	}
	return deduped
}

func redactError(err error) error {
	if err == nil {
		return nil
	}
	return errors.New(redactString(err.Error()))
}
