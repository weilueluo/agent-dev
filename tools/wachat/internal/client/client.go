package client

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"

	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
)

var (
	once      sync.Once
	storePath string
)

func StoreDir() string {
	once.Do(func() {
		home, err := os.UserHomeDir()
		if err != nil {
			home = "."
		}
		storePath = filepath.Join(home, ".wachat")
		os.MkdirAll(storePath, 0700)
	})
	return storePath
}

func DBPath() string {
	return filepath.Join(StoreDir(), "whatsmeow.db")
}

func newContainer(ctx context.Context) (*sqlstore.Container, error) {
	dsn := fmt.Sprintf("file:%s?_foreign_keys=on&_journal_mode=WAL", DBPath())
	container, err := sqlstore.New(ctx, "sqlite3", dsn, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to open store: %w", err)
	}
	return container, nil
}

// Connect creates a WhatsApp client, connects it, and returns it.
// If the device is not yet paired, the returned client will have Store.ID == nil.
func Connect(ctx context.Context) (*whatsmeow.Client, error) {
	container, err := newContainer(ctx)
	if err != nil {
		return nil, err
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	cli := whatsmeow.NewClient(deviceStore, nil)
	cli.EnableAutoReconnect = false

	if err := cli.Connect(); err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	return cli, nil
}

// NewClient creates a WhatsApp client without connecting.
// Use for auth flow where QR channel must be obtained before connecting.
func NewClient(ctx context.Context) (*whatsmeow.Client, error) {
	container, err := newContainer(ctx)
	if err != nil {
		return nil, err
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	cli := whatsmeow.NewClient(deviceStore, nil)
	cli.EnableAutoReconnect = false
	return cli, nil
}

// ConnectExisting connects only if already paired. Returns error if not.
func ConnectExisting(ctx context.Context) (*whatsmeow.Client, error) {
	cli, err := Connect(ctx)
	if err != nil {
		return nil, err
	}
	if cli.Store.ID == nil {
		cli.Disconnect()
		return nil, fmt.Errorf("not logged in — run 'wachat auth' first")
	}
	return cli, nil
}

// IsLoggedIn checks if a device session exists without fully connecting.
func IsLoggedIn(ctx context.Context) (bool, *types.JID, error) {
	container, err := newContainer(ctx)
	if err != nil {
		return false, nil, err
	}
	devices, err := container.GetAllDevices(ctx)
	if err != nil {
		return false, nil, err
	}
	if len(devices) == 0 {
		return false, nil, nil
	}
	id := devices[0].ID
	return id != nil, id, nil
}
