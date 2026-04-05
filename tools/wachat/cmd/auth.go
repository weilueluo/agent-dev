package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/mdp/qrterminal/v3"
	"github.com/spf13/cobra"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/client"
	"github.com/weilueluo/agent-dev/tools/wachat/internal/output"
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

var authBrowser bool

func init() {
	rootCmd.AddCommand(authCmd)
	authCmd.AddCommand(authStatusCmd)
	authCmd.Flags().BoolVar(&authBrowser, "browser", false, "Show QR code in browser instead of terminal")
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
				if authBrowser {
					openQRInBrowser(evt.Code)
				} else {
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, cmd.OutOrStdout())
				}
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

func openQRInBrowser(code string) {
	htmlPath := filepath.Join(os.TempDir(), "wachat-qr.html")
	html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>wachat — Scan QR Code</title>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<style>
  body { display:flex; flex-direction:column; align-items:center; justify-content:center;
         min-height:100vh; margin:0; font-family:system-ui; background:#111; color:#fff; }
  h2 { margin-bottom:8px; }
  p { color:#aaa; margin-top:4px; }
  canvas { border-radius:12px; margin-top:16px; }
</style></head><body>
<h2>Scan with WhatsApp</h2>
<p>Settings → Linked Devices → Link a Device</p>
<div id="qr"></div>
<p style="margin-top:24px;font-size:13px;color:#666">This page auto-refreshes. Keep it open.</p>
<script>
  var qr = qrcode(0, 'L');
  qr.addData(%q);
  qr.make();
  document.getElementById('qr').innerHTML = qr.createSvgTag(8, 16);
  var svg = document.querySelector('#qr svg');
  if (svg) { svg.style.borderRadius = '12px'; }
</script></body></html>`, code)

	if err := os.WriteFile(htmlPath, []byte(html), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write QR HTML: %v\n", err)
		return
	}

	fmt.Printf("Opening QR code in browser: %s\n", htmlPath)
	openBrowser(htmlPath)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	cmd.Start()
}
