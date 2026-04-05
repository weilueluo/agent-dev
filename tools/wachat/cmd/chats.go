package cmd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/client"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/output"
	"go.mau.fi/whatsmeow/types"
)

var chatsCmd = &cobra.Command{
	Use:   "chats",
	Short: "Manage chats",
}

var chatsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all chats",
	Run:   runChatsList,
}

var chatsQuery string

func init() {
	rootCmd.AddCommand(chatsCmd)
	chatsCmd.AddCommand(chatsListCmd)
	chatsListCmd.Flags().StringVar(&chatsQuery, "query", "", "Filter chats by name")
}

type ChatInfo struct {
	JID       string `json:"jid"`
	Name      string `json:"name"`
	IsGroup   bool   `json:"is_group"`
	Unread    int    `json:"unread,omitempty"`
	LastSeen  string `json:"last_active,omitempty"`
}

func runChatsList(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	// Wait briefly for initial sync
	time.Sleep(2 * time.Second)

	store := cli.Store
	contacts, err := store.Contacts.GetAllContacts(ctx)
	if err != nil {
		output.Error("failed to get contacts", err)
	}

	groups, err := cli.GetJoinedGroups(ctx)
	if err != nil {
		output.Error("failed to get groups", err)
	}

	var chats []ChatInfo

	// Add individual contacts
	for jid, info := range contacts {
		name := contactName(info)
		if chatsQuery != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(chatsQuery)) {
			continue
		}
		chats = append(chats, ChatInfo{
			JID:     jid.String(),
			Name:    name,
			IsGroup: false,
		})
	}

	// Add groups
	for _, g := range groups {
		name := g.Name
		if chatsQuery != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(chatsQuery)) {
			continue
		}
		chats = append(chats, ChatInfo{
			JID:     g.JID.String(),
			Name:    name,
			IsGroup: true,
		})
	}

	if jsonOutput {
		output.JSON(chats)
	} else {
		if len(chats) == 0 {
			fmt.Println("No chats found.")
			return
		}
		for _, c := range chats {
			tag := ""
			if c.IsGroup {
				tag = " [group]"
			}
			fmt.Printf("%-40s %s%s\n", c.JID, c.Name, tag)
		}
	}
}

func contactName(info types.ContactInfo) string {
	if info.FullName != "" {
		return info.FullName
	}
	if info.PushName != "" {
		return info.PushName
	}
	if info.BusinessName != "" {
		return info.BusinessName
	}
	return "(unknown)"
}
