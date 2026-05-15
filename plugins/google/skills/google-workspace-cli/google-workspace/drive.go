package main

import (
	"context"
	"fmt"
	"io"
	"os"

	driveapi "google.golang.org/api/drive/v3"
	"google.golang.org/api/googleapi"
)

const driveListFields googleapi.Field = "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink,parents,owners(displayName,emailAddress))"

func (a *app) runDrive(ctx context.Context, args []string) int {
	if len(args) == 0 || args[0] == "--help" || args[0] == "-h" {
		a.writeUsage()
		return 0
	}

	switch args[0] {
	case "search":
		return a.driveSearch(ctx, args[1:])
	case "recent":
		return a.driveRecent(ctx, args[1:])
	case "metadata":
		return a.driveMetadata(ctx, args[1:])
	case "permissions":
		return a.drivePermissions(ctx, args[1:])
	case "download":
		return a.driveDownload(ctx, args[1:])
	case "export":
		return a.driveExport(ctx, args[1:])
	case "create":
		return a.driveCreate(ctx, args[1:])
	default:
		return a.fail("unknown_drive_command", fmt.Errorf("unknown drive command %q", args[0]), []string{"Run with --help to see supported Drive commands."})
	}
}

func (a *app) driveSearch(ctx context.Context, args []string) int {
	fs := newFlagSet("drive search")
	query := fs.String("query", "", "Drive query")
	maxResults := fs.Int64("max-results", 10, "maximum results")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("query", *query); err != nil {
		return a.fail("invalid_args", err, []string{"Provide a Drive query, for example --query \"name contains 'report' and trashed=false\"."})
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Files.List().Q(*query).PageSize(*maxResults).Fields(driveListFields).Do()
	if err != nil {
		return a.fail("drive_search_failed", redactError(err), []string{"Check Drive API enablement, scopes, and query syntax."})
	}
	return a.writeOK(res)
}

func (a *app) driveRecent(ctx context.Context, args []string) int {
	fs := newFlagSet("drive recent")
	maxResults := fs.Int64("max-results", 10, "maximum results")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Files.List().Q("trashed=false").OrderBy("modifiedTime desc").PageSize(*maxResults).Fields(driveListFields).Do()
	if err != nil {
		return a.fail("drive_recent_failed", redactError(err), []string{"Check Drive API enablement and scopes."})
	}
	return a.writeOK(res)
}

func (a *app) driveMetadata(ctx context.Context, args []string) int {
	fs := newFlagSet("drive metadata")
	id := fs.String("id", "", "file ID")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("id", *id); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Files.Get(*id).Fields("*").Do()
	if err != nil {
		return a.fail("drive_metadata_failed", redactError(err), []string{"Check file ID and Drive read scope."})
	}
	return a.writeOK(res)
}

func (a *app) drivePermissions(ctx context.Context, args []string) int {
	fs := newFlagSet("drive permissions")
	id := fs.String("id", "", "file ID")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("id", *id); err != nil {
		return a.fail("invalid_args", err, nil)
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Permissions.List(*id).Fields("nextPageToken,permissions(id,type,role,emailAddress,domain,displayName,deleted)").Do()
	if err != nil {
		return a.fail("drive_permissions_failed", redactError(err), []string{"Check file ID and Drive read scope."})
	}
	return a.writeOK(res)
}

func (a *app) driveDownload(ctx context.Context, args []string) int {
	fs := newFlagSet("drive download")
	id := fs.String("id", "", "file ID")
	output := fs.String("output", "", "output path")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("id", *id); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	if err := requireFlag("output", *output); err != nil {
		return a.fail("invalid_args", err, []string{"Provide an explicit output path so file contents are not printed to the terminal."})
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Files.Get(*id).Download()
	if err != nil {
		return a.fail("drive_download_failed", redactError(err), []string{"Check file ID and Drive read scope. Use export for Google Docs-native files."})
	}
	defer res.Body.Close()
	bytesWritten, err := writeResponseBody(*output, res.Body)
	if err != nil {
		return a.fail("write_failed", err, nil)
	}
	return a.writeOK(map[string]any{"id": *id, "output": *output, "bytes": bytesWritten, "content_type": res.Header.Get("Content-Type")})
}

func (a *app) driveExport(ctx context.Context, args []string) int {
	fs := newFlagSet("drive export")
	id := fs.String("id", "", "file ID")
	mimeType := fs.String("mime-type", "", "export MIME type")
	output := fs.String("output", "", "output path")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	for name, value := range map[string]string{"id": *id, "mime-type": *mimeType, "output": *output} {
		if err := requireFlag(name, value); err != nil {
			return a.fail("invalid_args", err, nil)
		}
	}

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	res, err := services.drive.Files.Export(*id, *mimeType).Download()
	if err != nil {
		return a.fail("drive_export_failed", redactError(err), []string{"Check file ID, export MIME type, and Drive read scope."})
	}
	defer res.Body.Close()
	bytesWritten, err := writeResponseBody(*output, res.Body)
	if err != nil {
		return a.fail("write_failed", err, nil)
	}
	return a.writeOK(map[string]any{"id": *id, "output": *output, "bytes": bytesWritten, "mime_type": *mimeType})
}

func (a *app) driveCreate(ctx context.Context, args []string) int {
	fs := newFlagSet("drive create")
	name := fs.String("name", "", "file name")
	mimeType := fs.String("mime-type", "text/plain", "file MIME type")
	contentFile := fs.String("content-file", "", "local content file")
	parent := fs.String("parent", "", "comma-separated parent folder IDs")
	if err := fs.Parse(args); err != nil {
		return a.fail("invalid_args", err, nil)
	}
	for flagName, value := range map[string]string{"name": *name, "content-file": *contentFile} {
		if err := requireFlag(flagName, value); err != nil {
			return a.fail("invalid_args", err, nil)
		}
	}
	file, err := os.Open(*contentFile)
	if err != nil {
		return a.fail("invalid_args", fmt.Errorf("open content file: %w", err), nil)
	}
	defer file.Close()

	services, err := a.newServices(ctx, driveScopes)
	if err != nil {
		return a.fail("auth_unavailable", redactError(err), authHints(driveScopes))
	}
	meta := buildDriveCreateMetadata(*name, *mimeType, splitCSV(*parent))
	res, err := services.drive.Files.Create(meta).Media(file).Fields("id,name,mimeType,webViewLink,parents").Do()
	if err != nil {
		return a.fail("drive_create_failed", redactError(err), []string{"Check Drive file scope and parent folder access."})
	}
	return a.writeOK(res)
}

func buildDriveCreateMetadata(name, mimeType string, parents []string) *driveapi.File {
	return &driveapi.File{
		Name:     name,
		MimeType: mimeType,
		Parents:  parents,
	}
}

func writeResponseBody(path string, body io.Reader) (int64, error) {
	output, err := os.Create(path)
	if err != nil {
		return 0, fmt.Errorf("create output file: %w", err)
	}
	defer output.Close()
	bytesWritten, err := io.Copy(output, body)
	if err != nil {
		return bytesWritten, fmt.Errorf("write output file: %w", err)
	}
	return bytesWritten, nil
}
