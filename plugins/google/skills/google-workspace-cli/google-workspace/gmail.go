package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"flag"
	"fmt"
	"mime"
	"os"
	"strings"

	gmailapi "google.golang.org/api/gmail/v1"
)

func (a *app) runGmail(ctx context.Context, args []string) int {
	if len(args) == 0 || args[0] == "--help" || args[0] == "-h" {
		a.writeUsage()
		return 0
	}

	switch args[0] {
	case "search":
		return a.gmailSearch(ctx, args[1:])
	case "thread":
		return a.gmailThread(ctx, args[1:])
	case "labels":
		return a.gmailLabels(ctx, args[1:])
	case "drafts":
		return a.gmailDrafts(ctx, args[1:])
	case "draft-create":
		return a.gmailDraftCreate(ctx, args[1:])
	case "label-thread":
		return a.gmailLabelThread(ctx, args[1:])
	default:
		return a.fail("unknown_gmail_command", fmt.Errorf("unknown gmail command %q", args[0]), []string{"Run with --help to see supported Gmail commands."})
	}
}

func (a *app) gmailSearch(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail search")
	user := fs.String("user", "me", "Gmail user ID")
	query := fs.String("query", "", "Gmail search query")
	maxResults := fs.Int64("max-results", 10, "maximum results")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("query", *query); err != nil {
		return a.fail("invalid_args", err, []string{"Provide a Gmail search query, for example --query \"from:alerts newer_than:7d\"."})
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Threads.List(*user).Q(*query).MaxResults(*maxResults).Do()
	if err != nil {
		return a.fail("gmail_search_failed", redactError(err), []string{"Check Gmail API enablement, scopes, and query syntax."})
	}
	return a.writeOK(res)
}

func (a *app) gmailThread(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail thread")
	user := fs.String("user", "me", "Gmail user ID")
	id := fs.String("id", "", "thread ID")
	format := fs.String("format", "metadata", "metadata, full, or minimal")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("id", *id); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if !validGmailFormat(*format) {
		return a.fail("invalid_args", fmt.Errorf("invalid format %q", *format), []string{"Use metadata, full, or minimal."})
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Threads.Get(*user, *id).Format(*format).Do()
	if err != nil {
		return a.fail("gmail_thread_failed", redactError(err), []string{"Check the thread ID and Gmail read scope."})
	}
	return a.writeOK(res)
}

func (a *app) gmailLabels(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail labels")
	user := fs.String("user", "me", "Gmail user ID")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Labels.List(*user).Do()
	if err != nil {
		return a.fail("gmail_labels_failed", redactError(err), []string{"Check Gmail API enablement and scopes."})
	}
	return a.writeOK(res)
}

func (a *app) gmailDrafts(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail drafts")
	user := fs.String("user", "me", "Gmail user ID")
	maxResults := fs.Int64("max-results", 10, "maximum results")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Drafts.List(*user).MaxResults(*maxResults).Do()
	if err != nil {
		return a.fail("gmail_drafts_failed", redactError(err), []string{"Check Gmail compose scope."})
	}
	return a.writeOK(res)
}

func (a *app) gmailDraftCreate(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail draft-create")
	user := fs.String("user", "me", "Gmail user ID")
	to := fs.String("to", "", "recipient email")
	cc := fs.String("cc", "", "comma-separated CC recipients")
	bcc := fs.String("bcc", "", "comma-separated BCC recipients")
	subject := fs.String("subject", "", "message subject")
	body := fs.String("body", "", "message body")
	bodyFile := fs.String("body-file", "", "path to message body file")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	for name, value := range map[string]string{"to": *to, "subject": *subject} {
		if err := requireFlag(name, value); err != nil {
			return a.fail("invalid_args", err, nil)
		}
	}
	messageBody, err := resolveBody(*body, *bodyFile)
	if err != nil {
		return a.fail("invalid_args", err, []string{"Provide exactly one of --body or --body-file."})
	}

	raw, err := buildRawEmail(emailDraft{
		To:      splitCSV(*to),
		Cc:      splitCSV(*cc),
		Bcc:     splitCSV(*bcc),
		Subject: *subject,
		Body:    messageBody,
	})
	if err != nil {
		return a.fail("invalid_message", err, nil)
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Drafts.Create(*user, &gmailapi.Draft{
		Message: &gmailapi.Message{Raw: raw},
	}).Do()
	if err != nil {
		return a.fail("gmail_draft_create_failed", redactError(err), []string{"Check Gmail compose scope and recipient addresses."})
	}
	return a.writeOK(map[string]any{
		"id":         res.Id,
		"message_id": res.Message.Id,
		"thread_id":  res.Message.ThreadId,
	})
}

func (a *app) gmailLabelThread(ctx context.Context, args []string) int {
	fs := newFlagSet("gmail label-thread")
	user := fs.String("user", "me", "Gmail user ID")
	threadID := fs.String("thread-id", "", "thread ID")
	addLabel := fs.String("add-label", "", "comma-separated labels to add")
	removeLabel := fs.String("remove-label", "", "comma-separated labels to remove")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("thread-id", *threadID); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	addLabels := splitCSV(*addLabel)
	removeLabels := splitCSV(*removeLabel)
	if len(addLabels) == 0 && len(removeLabels) == 0 {
		return a.fail("invalid_args", fmt.Errorf("no label changes requested"), []string{"Provide --add-label or --remove-label."})
	}

	services, err := a.newServices(ctx, gmailScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(gmailScopes))
	}
	res, err := services.gmail.Users.Threads.Modify(*user, *threadID, &gmailapi.ModifyThreadRequest{
		AddLabelIds:    addLabels,
		RemoveLabelIds: removeLabels,
	}).Do()
	if err != nil {
		return a.fail("gmail_label_thread_failed", redactError(err), []string{"Check thread and label IDs."})
	}
	return a.writeOK(res)
}

func validGmailFormat(format string) bool {
	switch format {
	case "metadata", "full", "minimal":
		return true
	default:
		return false
	}
}

type emailDraft struct {
	To      []string
	Cc      []string
	Bcc     []string
	Subject string
	Body    string
}

func resolveBody(body, bodyFile string) (string, error) {
	if strings.TrimSpace(body) != "" && strings.TrimSpace(bodyFile) != "" {
		return "", fmt.Errorf("--body and --body-file are mutually exclusive")
	}
	if strings.TrimSpace(bodyFile) != "" {
		content, err := os.ReadFile(bodyFile)
		if err != nil {
			return "", fmt.Errorf("read body file: %w", err)
		}
		return string(content), nil
	}
	if strings.TrimSpace(body) == "" {
		return "", fmt.Errorf("missing message body")
	}
	return body, nil
}

func buildRawEmail(draft emailDraft) (string, error) {
	if len(draft.To) == 0 {
		return "", fmt.Errorf("at least one To recipient is required")
	}
	if strings.TrimSpace(draft.Subject) == "" {
		return "", fmt.Errorf("subject is required")
	}

	var message bytes.Buffer
	writeHeader(&message, "To", strings.Join(draft.To, ", "))
	if len(draft.Cc) > 0 {
		writeHeader(&message, "Cc", strings.Join(draft.Cc, ", "))
	}
	if len(draft.Bcc) > 0 {
		writeHeader(&message, "Bcc", strings.Join(draft.Bcc, ", "))
	}
	writeHeader(&message, "Subject", mime.QEncoding.Encode("utf-8", draft.Subject))
	writeHeader(&message, "MIME-Version", "1.0")
	writeHeader(&message, "Content-Type", `text/plain; charset="UTF-8"`)
	writeHeader(&message, "Content-Transfer-Encoding", "8bit")
	message.WriteString("\r\n")
	message.WriteString(draft.Body)

	return base64.URLEncoding.EncodeToString(message.Bytes()), nil
}

func writeHeader(buf *bytes.Buffer, name, value string) {
	fmt.Fprintf(buf, "%s: %s\r\n", name, value)
}

func addCommonUserFlag(fs *flag.FlagSet) *string {
	return fs.String("user", "me", "Gmail user ID")
}
