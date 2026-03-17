package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"

	"github.com/mdp/qrterminal/v3"
	"github.com/spf13/cobra"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/client"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/output"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/store"
	"go.mau.fi/whatsmeow/types/events"
)

var messagesCmd = &cobra.Command{
	Use:   "messages",
	Short: "Search and list messages",
}

var messagesListCmd = &cobra.Command{
	Use:   "list",
	Short: "List messages in a chat",
	Run:   runMessagesList,
}

var messagesSearchCmd = &cobra.Command{
	Use:   "search [query]",
	Short: "Search messages",
	Args:  cobra.ExactArgs(1),
	Run:   runMessagesSearch,
}

var messagesSyncCmd = &cobra.Command{
	Use:   "sync",
	Short: "Sync messages from WhatsApp (stay connected to receive history)",
	Run:   runMessagesSync,
}

var (
	msgChatJID string
	msgLimit   int
	msgAfter   string
	msgBefore  string
	syncWait   int
	syncReauth bool
)

func init() {
	rootCmd.AddCommand(messagesCmd)
	messagesCmd.AddCommand(messagesListCmd)
	messagesCmd.AddCommand(messagesSearchCmd)
	messagesCmd.AddCommand(messagesSyncCmd)

	messagesListCmd.Flags().StringVar(&msgChatJID, "chat", "", "Chat JID to list messages from")
	messagesListCmd.Flags().IntVar(&msgLimit, "limit", 50, "Max messages to return")
	messagesListCmd.Flags().StringVar(&msgAfter, "after", "", "After date (YYYY-MM-DD)")
	messagesListCmd.Flags().StringVar(&msgBefore, "before", "", "Before date (YYYY-MM-DD)")
	messagesListCmd.MarkFlagRequired("chat")

	messagesSearchCmd.Flags().StringVar(&msgChatJID, "chat", "", "Limit search to a chat")
	messagesSearchCmd.Flags().IntVar(&msgLimit, "limit", 50, "Max results")

	messagesSyncCmd.Flags().IntVar(&syncWait, "wait", 30, "Seconds to wait for history sync")
	messagesSyncCmd.Flags().BoolVar(&syncReauth, "reauth", false, "Re-link device to trigger fresh history sync (requires QR scan)")
	messagesSyncCmd.Flags().BoolVar(&authBrowser, "browser", false, "Show QR code in browser (used with --reauth)")
}

func runMessagesList(cmd *cobra.Command, args []string) {
	msgStore, err := store.Open()
	if err != nil {
		output.Error("failed to open message store", err)
	}
	defer msgStore.Close()

	var after, before *time.Time
	if msgAfter != "" {
		t, err := time.Parse("2006-01-02", msgAfter)
		if err != nil {
			output.Error("invalid --after date", err)
		}
		after = &t
	}
	if msgBefore != "" {
		t, err := time.Parse("2006-01-02", msgBefore)
		if err != nil {
			output.Error("invalid --before date", err)
		}
		before = &t
	}

	msgs, err := msgStore.ListMessages(msgChatJID, msgLimit, after, before)
	if err != nil {
		output.Error("failed to list messages", err)
	}

	if jsonOutput {
		output.JSON(msgs)
	} else {
		if len(msgs) == 0 {
			fmt.Println("No messages found. Try running 'wachat messages sync --reauth' first.")
			return
		}
		for _, m := range msgs {
			ts := time.Unix(m.Timestamp, 0).Format("2006-01-02 15:04")
			body := m.Body
			if len(body) > 120 {
				body = body[:120] + "..."
			}
			fmt.Printf("[%s] %s: %s\n", ts, m.SenderName, body)
		}
	}
}

func runMessagesSearch(cmd *cobra.Command, args []string) {
	query := args[0]

	msgStore, err := store.Open()
	if err != nil {
		output.Error("failed to open message store", err)
	}
	defer msgStore.Close()

	msgs, err := msgStore.SearchMessages(query, msgChatJID, msgLimit)
	if err != nil {
		output.Error("search failed", err)
	}

	if jsonOutput {
		output.JSON(msgs)
	} else {
		if len(msgs) == 0 {
			fmt.Println("No messages found. Try running 'wachat messages sync --reauth' first.")
			return
		}
		for _, m := range msgs {
			ts := time.Unix(m.Timestamp, 0).Format("2006-01-02 15:04")
			body := m.Body
			if len(body) > 120 {
				body = body[:120] + "..."
			}
			chat := m.ChatJID
			fmt.Printf("[%s] %s | %s: %s\n", ts, chat, m.SenderName, body)
		}
	}
}

func runMessagesSync(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	msgStore, err := store.Open()
	if err != nil {
		output.Error("failed to open message store", err)
	}
	defer msgStore.Close()

	var count atomic.Int64
	historySyncHandler := buildHistorySyncHandler(msgStore, &count)

	if syncReauth {
		// Delete existing session to trigger fresh history sync
		dbPath := filepath.Join(client.StoreDir(), "whatsmeow.db")
		os.Remove(dbPath)
		fmt.Println("Session cleared. Scan QR to re-link and sync history.")

		cli, err := client.NewClient(ctx)
		if err != nil {
			output.Error("failed to create client", err)
		}
		defer cli.Disconnect()

		cli.AddEventHandler(historySyncHandler)

		qrChan, err := cli.GetQRChannel(ctx)
		if err != nil {
			output.Error("failed to get QR channel", err)
		}

		if err := cli.Connect(); err != nil {
			output.Error("failed to connect", err)
		}

		// Wait for QR scan
		authenticated := false
		for evt := range qrChan {
			switch evt.Event {
			case "code":
				if authBrowser {
					openQRInBrowser(evt.Code)
				} else {
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, cmd.OutOrStdout())
				}
				fmt.Println("\nScan QR code, then history sync will begin...")
			case "success":
				fmt.Println("✓ Authenticated! Waiting for history sync...")
				authenticated = true
			case "timeout":
				output.Error("QR code expired — please try again", nil)
			case "error":
				output.Error("authentication error", fmt.Errorf("%v", evt.Error))
			}
			if authenticated {
				break
			}
		}

		fmt.Printf("Syncing messages for %d seconds...\n", syncWait)
		time.Sleep(time.Duration(syncWait) * time.Second)
	} else {
		// Normal sync — just listen for new messages
		cli, err := client.NewExistingClient(ctx)
		if err != nil {
			output.Error("connection failed", err)
		}
		defer cli.Disconnect()

		cli.AddEventHandler(historySyncHandler)

		if err := cli.Connect(); err != nil {
			output.Error("failed to connect", err)
		}

		fmt.Printf("Syncing messages for %d seconds...\n", syncWait)
		time.Sleep(time.Duration(syncWait) * time.Second)
	}

	if jsonOutput {
		output.JSON(map[string]any{
			"ok":             true,
			"messages_saved": count.Load(),
		})
	} else {
		fmt.Printf("✓ Synced %d messages\n", count.Load())
	}
}

func buildHistorySyncHandler(msgStore *store.MessageStore, count *atomic.Int64) func(interface{}) {
	return func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			sender := v.Info.Sender
			chat := v.Info.Chat
			body := extractBody(v)
			if body == "" {
				return
			}
			senderName := v.Info.PushName
			if senderName == "" {
				senderName = sender.User
			}
			err := msgStore.InsertMessage(store.Message{
				ID:         v.Info.ID,
				ChatJID:    chat.String(),
				SenderJID:  sender.String(),
				SenderName: senderName,
				Body:       body,
				Timestamp:  v.Info.Timestamp.Unix(),
				Type:       "text",
			})
			if err == nil {
				count.Add(1)
			}

		case *events.HistorySync:
			if v.Data == nil {
				return
			}
			for _, conv := range v.Data.GetConversations() {
				chatJID := conv.GetID()
				for _, hMsg := range conv.GetMessages() {
					wmi := hMsg.GetMessage()
					if wmi == nil {
						continue
					}
					msg := wmi.GetMessage()
					key := wmi.GetKey()
					if msg == nil || key == nil {
						continue
					}

					body := ""
					if msg.GetConversation() != "" {
						body = msg.GetConversation()
					} else if ext := msg.GetExtendedTextMessage(); ext != nil {
						body = ext.GetText()
					} else if img := msg.GetImageMessage(); img != nil {
						if img.GetCaption() != "" {
							body = "[image] " + img.GetCaption()
						} else {
							body = "[image]"
						}
					} else if vid := msg.GetVideoMessage(); vid != nil {
						if vid.GetCaption() != "" {
							body = "[video] " + vid.GetCaption()
						} else {
							body = "[video]"
						}
					} else if doc := msg.GetDocumentMessage(); doc != nil {
						body = "[document] " + doc.GetFileName()
					} else if msg.GetAudioMessage() != nil {
						body = "[audio]"
					}
					if body == "" {
						continue
					}

					senderJID := key.GetParticipant()
					if senderJID == "" {
						senderJID = key.GetRemoteJID()
					}
					senderName := wmi.GetPushName()
					if senderName == "" {
						senderName = senderJID
					}

					ts := int64(wmi.GetMessageTimestamp())
					err := msgStore.InsertMessage(store.Message{
						ID:         key.GetID(),
						ChatJID:    chatJID,
						SenderJID:  senderJID,
						SenderName: senderName,
						Body:       body,
						Timestamp:  ts,
						Type:       "text",
					})
					if err == nil {
						count.Add(1)
					}
				}
			}
		}
	}
}

func extractBody(msg *events.Message) string {
	m := msg.Message
	if m == nil {
		return ""
	}
	if m.GetConversation() != "" {
		return m.GetConversation()
	}
	if ext := m.GetExtendedTextMessage(); ext != nil {
		return ext.GetText()
	}
	if img := m.GetImageMessage(); img != nil {
		cap := img.GetCaption()
		if cap != "" {
			return "[image] " + cap
		}
		return "[image]"
	}
	if vid := m.GetVideoMessage(); vid != nil {
		cap := vid.GetCaption()
		if cap != "" {
			return "[video] " + cap
		}
		return "[video]"
	}
	if doc := m.GetDocumentMessage(); doc != nil {
		return "[document] " + doc.GetFileName()
	}
	if aud := msg.Message.GetAudioMessage(); aud != nil {
		return "[audio]"
	}
	return ""
}
