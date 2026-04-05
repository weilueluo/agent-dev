package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/client"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/output"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

var sendCmd = &cobra.Command{
	Use:   "send",
	Short: "Send messages",
}

var sendTextCmd = &cobra.Command{
	Use:   "text",
	Short: "Send a text message",
	Run:   runSendText,
}

var sendFileCmd = &cobra.Command{
	Use:   "file",
	Short: "Send a file",
	Run:   runSendFile,
}

var (
	sendTo      string
	sendMessage string
	sendFile    string
	sendCaption string
)

func init() {
	rootCmd.AddCommand(sendCmd)
	sendCmd.AddCommand(sendTextCmd)
	sendCmd.AddCommand(sendFileCmd)

	sendTextCmd.Flags().StringVar(&sendTo, "to", "", "Recipient phone number or JID")
	sendTextCmd.Flags().StringVar(&sendMessage, "message", "", "Message text")
	sendTextCmd.MarkFlagRequired("to")
	sendTextCmd.MarkFlagRequired("message")

	sendFileCmd.Flags().StringVar(&sendTo, "to", "", "Recipient phone number or JID")
	sendFileCmd.Flags().StringVar(&sendFile, "file", "", "Path to file")
	sendFileCmd.Flags().StringVar(&sendCaption, "caption", "", "Optional caption")
	sendFileCmd.MarkFlagRequired("to")
	sendFileCmd.MarkFlagRequired("file")
}

func parseRecipient(raw string) (types.JID, error) {
	if strings.Contains(raw, "@") {
		return types.ParseJID(raw)
	}
	// Bare phone number → user JID
	raw = strings.TrimPrefix(raw, "+")
	return types.NewJID(raw, types.DefaultUserServer), nil
}

func runSendText(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	jid, err := parseRecipient(sendTo)
	if err != nil {
		output.Error("invalid recipient", err)
	}

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	msg := &waE2E.Message{
		Conversation: proto.String(sendMessage),
	}

	resp, err := cli.SendMessage(ctx, jid, msg)
	if err != nil {
		output.Error("failed to send message", err)
	}

	if jsonOutput {
		output.JSON(map[string]any{
			"ok":        true,
			"id":        resp.ID,
			"timestamp": resp.Timestamp.Unix(),
			"to":        jid.String(),
		})
	} else {
		fmt.Printf("✓ Message sent to %s (ID: %s)\n", jid, resp.ID)
	}
}

func runSendFile(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	jid, err := parseRecipient(sendTo)
	if err != nil {
		output.Error("invalid recipient", err)
	}

	data, err := os.ReadFile(sendFile)
	if err != nil {
		output.Error("failed to read file", err)
	}

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	mime := detectMIME(sendFile)
	mediaType := mimeToMediaType(mime)

	uploaded, err := cli.Upload(ctx, data, mediaType)
	if err != nil {
		output.Error("failed to upload file", err)
	}

	fileName := filepath.Base(sendFile)
	msg := buildMediaMessage(uploaded, mime, fileName, sendCaption, data)

	resp, err := cli.SendMessage(ctx, jid, msg)
	if err != nil {
		output.Error("failed to send file", err)
	}

	if jsonOutput {
		output.JSON(map[string]any{
			"ok":        true,
			"id":        resp.ID,
			"timestamp": resp.Timestamp.Unix(),
			"to":        jid.String(),
			"file":      fileName,
		})
	} else {
		fmt.Printf("✓ File '%s' sent to %s (ID: %s)\n", fileName, jid, resp.ID)
	}
}

func detectMIME(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	case ".ogg":
		return "audio/ogg"
	case ".pdf":
		return "application/pdf"
	case ".doc", ".docx":
		return "application/msword"
	default:
		return "application/octet-stream"
	}
}

func mimeToMediaType(mime string) whatsmeow.MediaType {
	switch {
	case strings.HasPrefix(mime, "image/"):
		return whatsmeow.MediaImage
	case strings.HasPrefix(mime, "video/"):
		return whatsmeow.MediaVideo
	case strings.HasPrefix(mime, "audio/"):
		return whatsmeow.MediaAudio
	default:
		return whatsmeow.MediaDocument
	}
}

func buildMediaMessage(up whatsmeow.UploadResponse, mime, fileName, caption string, data []byte) *waE2E.Message {
	switch {
	case strings.HasPrefix(mime, "image/"):
		return &waE2E.Message{
			ImageMessage: &waE2E.ImageMessage{
				URL:           proto.String(up.URL),
				DirectPath:    proto.String(up.DirectPath),
				MediaKey:      up.MediaKey,
				FileEncSHA256: up.FileEncSHA256,
				FileSHA256:    up.FileSHA256,
				FileLength:    proto.Uint64(up.FileLength),
				Mimetype:      proto.String(mime),
				Caption:       proto.String(caption),
			},
		}
	case strings.HasPrefix(mime, "video/"):
		return &waE2E.Message{
			VideoMessage: &waE2E.VideoMessage{
				URL:           proto.String(up.URL),
				DirectPath:    proto.String(up.DirectPath),
				MediaKey:      up.MediaKey,
				FileEncSHA256: up.FileEncSHA256,
				FileSHA256:    up.FileSHA256,
				FileLength:    proto.Uint64(up.FileLength),
				Mimetype:      proto.String(mime),
				Caption:       proto.String(caption),
			},
		}
	case strings.HasPrefix(mime, "audio/"):
		return &waE2E.Message{
			AudioMessage: &waE2E.AudioMessage{
				URL:           proto.String(up.URL),
				DirectPath:    proto.String(up.DirectPath),
				MediaKey:      up.MediaKey,
				FileEncSHA256: up.FileEncSHA256,
				FileSHA256:    up.FileSHA256,
				FileLength:    proto.Uint64(up.FileLength),
				Mimetype:      proto.String(mime),
			},
		}
	default:
		return &waE2E.Message{
			DocumentMessage: &waE2E.DocumentMessage{
				URL:           proto.String(up.URL),
				DirectPath:    proto.String(up.DirectPath),
				MediaKey:      up.MediaKey,
				FileEncSHA256: up.FileEncSHA256,
				FileSHA256:    up.FileSHA256,
				FileLength:    proto.Uint64(up.FileLength),
				Mimetype:      proto.String(mime),
				FileName:      proto.String(fileName),
				Caption:       proto.String(caption),
			},
		}
	}
}
