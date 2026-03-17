package cmd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/client"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/output"
	"go.mau.fi/whatsmeow/types"
)

var groupsCmd = &cobra.Command{
	Use:   "groups",
	Short: "Manage groups",
}

var groupsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List joined groups",
	Run:   runGroupsList,
}

var groupsInfoCmd = &cobra.Command{
	Use:   "info",
	Short: "Show group details",
	Run:   runGroupsInfo,
}

var (
	groupsListQuery string
	groupsInfoJID   string
)

func init() {
	rootCmd.AddCommand(groupsCmd)
	groupsCmd.AddCommand(groupsListCmd)
	groupsCmd.AddCommand(groupsInfoCmd)
	groupsListCmd.Flags().StringVar(&groupsListQuery, "query", "", "Filter groups by name")
	groupsInfoCmd.Flags().StringVar(&groupsInfoJID, "jid", "", "Group JID")
	groupsInfoCmd.MarkFlagRequired("jid")
}

type GroupResult struct {
	JID          string   `json:"jid"`
	Name         string   `json:"name"`
	Topic        string   `json:"topic,omitempty"`
	Participants int      `json:"participants"`
	Admins       []string `json:"admins,omitempty"`
}

func runGroupsList(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	time.Sleep(2 * time.Second)

	groups, err := cli.GetJoinedGroups(ctx)
	if err != nil {
		output.Error("failed to get groups", err)
	}

	var results []GroupResult
	for _, g := range groups {
		if groupsListQuery != "" && !strings.Contains(strings.ToLower(g.Name), strings.ToLower(groupsListQuery)) {
			continue
		}
		results = append(results, GroupResult{
			JID:          g.JID.String(),
			Name:         g.Name,
			Topic:        g.Topic,
			Participants: len(g.Participants),
		})
	}

	if jsonOutput {
		output.JSON(results)
	} else {
		if len(results) == 0 {
			fmt.Println("No groups found.")
			return
		}
		for _, g := range results {
			fmt.Printf("%-40s %s (%d members)\n", g.JID, g.Name, g.Participants)
		}
	}
}

func runGroupsInfo(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	jid, err := types.ParseJID(groupsInfoJID)
	if err != nil {
		output.Error("invalid JID", err)
	}

	cli, err := client.ConnectExisting(ctx)
	if err != nil {
		output.Error("connection failed", err)
	}
	defer cli.Disconnect()

	time.Sleep(1 * time.Second)

	info, err := cli.GetGroupInfo(ctx, jid)
	if err != nil {
		output.Error("failed to get group info", err)
	}

	var admins []string
	for _, p := range info.Participants {
		if p.IsAdmin || p.IsSuperAdmin {
			admins = append(admins, p.JID.String())
		}
	}

	result := GroupResult{
		JID:          info.JID.String(),
		Name:         info.Name,
		Topic:        info.Topic,
		Participants: len(info.Participants),
		Admins:       admins,
	}

	if jsonOutput {
		output.JSON(result)
	} else {
		fmt.Printf("Group: %s\n", result.Name)
		fmt.Printf("JID:   %s\n", result.JID)
		if result.Topic != "" {
			fmt.Printf("Topic: %s\n", result.Topic)
		}
		fmt.Printf("Members: %d\n", result.Participants)
		if len(admins) > 0 {
			fmt.Printf("Admins: %s\n", strings.Join(admins, ", "))
		}
	}
}
