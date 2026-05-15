package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestParseScopesDedupesAliases(t *testing.T) {
	scopes := parseScopes("gmail,drive,gmail.readonly")
	want := []string{scopeGmailReadonly, scopeGmailCompose, scopeGmailModify, scopeDriveReadonly, scopeDriveFile}
	if strings.Join(scopes, ",") != strings.Join(want, ",") {
		t.Fatalf("unexpected scopes: got %v want %v", scopes, want)
	}
}

func TestMissingQueryFailsBeforeAuth(t *testing.T) {
	var out bytes.Buffer
	app := newApp(&out, &bytes.Buffer{}, func(context.Context, []string) (*googleServices, error) {
		t.Fatal("auth should not be attempted for invalid args")
		return nil, nil
	})

	code := app.run(context.Background(), []string{"gmail", "search"})
	if code == 0 {
		t.Fatal("expected non-zero exit")
	}

	var envelope jsonEnvelope
	if err := json.Unmarshal(out.Bytes(), &envelope); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if envelope.OK || envelope.Error == nil || envelope.Error.Code != "invalid_args" {
		t.Fatalf("unexpected envelope: %+v", envelope)
	}
}

func TestAuthCheckRedactsCredentialErrors(t *testing.T) {
	var out bytes.Buffer
	app := newApp(&out, &bytes.Buffer{}, func(context.Context, []string) (*googleServices, error) {
		return nil, errors.New("access_token=ya29.secret client_secret=shh")
	})

	code := app.run(context.Background(), []string{"auth-check", "--scopes", "gmail"})
	if code == 0 {
		t.Fatal("expected non-zero exit")
	}
	if strings.Contains(out.String(), "ya29.secret") || strings.Contains(out.String(), "shh") {
		t.Fatalf("secret leaked in output: %s", out.String())
	}
	if !strings.Contains(out.String(), "[REDACTED]") {
		t.Fatalf("expected redaction marker in output: %s", out.String())
	}
}

func TestBuildRawEmailShapesRFC822Message(t *testing.T) {
	raw, err := buildRawEmail(emailDraft{
		To:      []string{"user@example.com"},
		Cc:      []string{"copy@example.com"},
		Subject: "Hello",
		Body:    "Body text",
	})
	if err != nil {
		t.Fatalf("buildRawEmail returned error: %v", err)
	}

	decoded, err := base64.URLEncoding.DecodeString(raw)
	if err != nil {
		t.Fatalf("raw message is not base64url: %v", err)
	}
	message := string(decoded)
	for _, want := range []string{
		"To: user@example.com\r\n",
		"Cc: copy@example.com\r\n",
		"Subject: Hello\r\n",
		"Content-Type: text/plain; charset=\"UTF-8\"\r\n",
		"\r\nBody text",
	} {
		if !strings.Contains(message, want) {
			t.Fatalf("message missing %q in %q", want, message)
		}
	}
}

func TestDriveCreateMetadata(t *testing.T) {
	meta := buildDriveCreateMetadata("report.txt", "text/plain", []string{"folder-1"})
	if meta.Name != "report.txt" || meta.MimeType != "text/plain" || len(meta.Parents) != 1 || meta.Parents[0] != "folder-1" {
		t.Fatalf("unexpected metadata: %+v", meta)
	}
}
