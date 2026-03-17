package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/spf13/cobra"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/client"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/output"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/store"
	"go.mau.fi/whatsmeow/types"
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
			fmt.Println("No messages found. Try running 'wachat messages sync' first.")
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
			fmt.Println("No messages found. Try running 'wachat messages sync' first.")
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

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	count := 0

	// Get contacts for name resolution
	contacts, _ := cli.Store.Contacts.GetAllContacts(ctx)
	nameOf := func(jid types.JID) string {
		if c, ok := contacts[jid]; ok {
			return contactName(c)
		}
		return jid.User
	}

	cli.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			sender := v.Info.Sender
			chat := v.Info.Chat
			body := extractBody(v)
			if body == "" {
				return
			}
			err := msgStore.InsertMessage(store.Message{
				ID:         v.Info.ID,
				ChatJID:    chat.String(),
				SenderJID:  sender.String(),
				SenderName: nameOf(sender),
				Body:       body,
				Timestamp:  v.Info.Timestamp.Unix(),
				Type:       "text",
			})
			if err == nil {
				count++
			}
		}
	})

	fmt.Printf("Syncing messages for %d seconds...\n", syncWait)
	time.Sleep(time.Duration(syncWait) * time.Second)

	if jsonOutput {
		output.JSON(map[string]any{
			"ok":             true,
			"messages_saved": count,
		})
	} else {
		fmt.Printf("✓ Synced %d messages\n", count)
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
	if aud := m.GetAudioMessage(); aud != nil {
		return "[audio]"
	}
	return ""
}
