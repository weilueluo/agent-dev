package cmd

import (
	"context"
	"fmt"
	"time"

	"github.com/mdp/qrterminal/v3"
	"github.com/spf13/cobra"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/client"
	"github.com/weilueluo/my-plugins/tools/wachat/internal/output"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authenticate with WhatsApp via QR code",
	Run:   runAuth,
}

var authStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check authentication status",
	Run:   runAuthStatus,
}

func init() {
	rootCmd.AddCommand(authCmd)
	authCmd.AddCommand(authStatusCmd)
}

func runAuth(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	loggedIn, jid, err := client.IsLoggedIn(ctx)
	if err != nil {
		output.Error("failed to check login status", err)
	}
	if loggedIn {
		if jsonOutput {
			output.JSON(map[string]any{
				"ok":      true,
				"message": "already logged in",
				"jid":     jid.String(),
			})
		} else {
			fmt.Printf("Already logged in as %s\n", jid)
		}
		return
	}

	cli, err := client.NewClient(ctx)
	if err != nil {
		output.Error("failed to create client", err)
	}
	defer cli.Disconnect()

	qrChan, err := cli.GetQRChannel(ctx)
	if err != nil {
		output.Error("failed to get QR channel", err)
	}

	if err := cli.Connect(); err != nil {
		output.Error("failed to connect", err)
	}

	fmt.Println("Scan the QR code with WhatsApp on your phone:")
	fmt.Println("  WhatsApp > Settings > Linked Devices > Link a Device")
	fmt.Println()

	timeout := time.After(2 * time.Minute)
	for {
		select {
		case evt, ok := <-qrChan:
			if !ok {
				output.Error("QR channel closed unexpectedly", nil)
			}
			switch evt.Event {
			case "code":
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, cmd.OutOrStdout())
				fmt.Println("\nWaiting for scan...")
			case "success":
				if jsonOutput {
					output.Success("logged in successfully")
				} else {
					fmt.Println("✓ Logged in successfully!")
				}
				return
			case "timeout":
				output.Error("QR code expired — please try again", nil)
			case "error":
				output.Error("authentication error", fmt.Errorf("%v", evt.Error))
			}
		case <-timeout:
			output.Error("timed out waiting for QR scan", nil)
		}
	}
}

func runAuthStatus(cmd *cobra.Command, args []string) {
	ctx := context.Background()

	loggedIn, jid, err := client.IsLoggedIn(ctx)
	if err != nil {
		output.Error("failed to check status", err)
	}

	if jsonOutput {
		result := map[string]any{
			"authenticated": loggedIn,
		}
		if loggedIn && jid != nil {
			result["jid"] = jid.String()
		}
		output.JSON(result)
	} else {
		if loggedIn {
			fmt.Printf("Authenticated as %s\n", jid)
		} else {
			fmt.Println("Not authenticated. Run 'wachat auth' to log in.")
		}
	}
}
