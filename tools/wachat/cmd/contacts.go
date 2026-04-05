package cmd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/client"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/output"
)

var contactsCmd = &cobra.Command{
	Use:   "contacts",
	Short: "Manage contacts",
}

var contactsSearchCmd = &cobra.Command{
	Use:   "search [query]",
	Short: "Search contacts by name",
	Args:  cobra.ExactArgs(1),
	Run:   runContactsSearch,
}

func init() {
	rootCmd.AddCommand(contactsCmd)
	contactsCmd.AddCommand(contactsSearchCmd)
}

type ContactResult struct {
	JID          string `json:"jid"`
	Name         string `json:"name"`
	PushName     string `json:"push_name,omitempty"`
	BusinessName string `json:"business_name,omitempty"`
}

func runContactsSearch(cmd *cobra.Command, args []string) {
	ctx := context.Background()
	query := strings.ToLower(args[0])

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	time.Sleep(2 * time.Second)

	contacts, err := cli.Store.Contacts.GetAllContacts(ctx)
	if err != nil {
		output.Error("failed to get contacts", err)
	}

	var results []ContactResult
	for jid, info := range contacts {
		name := contactName(info)
		if strings.Contains(strings.ToLower(name), query) ||
			strings.Contains(strings.ToLower(info.PushName), query) ||
			strings.Contains(strings.ToLower(info.BusinessName), query) ||
			strings.Contains(jid.String(), query) {
			results = append(results, ContactResult{
				JID:          jid.String(),
				Name:         name,
				PushName:     info.PushName,
				BusinessName: info.BusinessName,
			})
		}
	}

	if jsonOutput {
		output.JSON(results)
	} else {
		if len(results) == 0 {
			fmt.Println("No contacts found.")
			return
		}
		for _, c := range results {
			fmt.Printf("%-40s %s\n", c.JID, c.Name)
		}
	}
}
