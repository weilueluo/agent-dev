package store

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/weilueluo/agent-dev/tools/wachat/internal/client"
	_ "github.com/ncruces/go-sqlite3/driver"
	_ "github.com/ncruces/go-sqlite3/embed"
)

type Message struct {
	ID         string `json:"id"`
	ChatJID    string `json:"chat_jid"`
	SenderJID  string `json:"sender_jid"`
	SenderName string `json:"sender_name"`
	Body       string `json:"body"`
	Timestamp  int64  `json:"timestamp"`
	Type       string `json:"type"`
}

type MessageStore struct {
	db *sql.DB
}

func Open() (*MessageStore, error) {
	dbPath := filepath.Join(client.StoreDir(), "messages.db")
	dsn := fmt.Sprintf("file:%s?_foreign_keys=on&_journal_mode=WAL", dbPath)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}

	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}

	return &MessageStore{db: db}, nil
}

func (s *MessageStore) Close() error {
	return s.db.Close()
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT NOT NULL,
			chat_jid TEXT NOT NULL,
			sender_jid TEXT NOT NULL,
			sender_name TEXT DEFAULT '',
			body TEXT DEFAULT '',
			timestamp INTEGER NOT NULL,
			type TEXT DEFAULT 'text',
			PRIMARY KEY (id, chat_jid)
		);
		CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_jid, timestamp DESC);
		CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(timestamp DESC);

		CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
			body,
			content='messages',
			content_rowid='rowid'
		);

		CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
			INSERT INTO messages_fts(rowid, body) VALUES (new.rowid, new.body);
		END;
	`)
	return err
}

func (s *MessageStore) InsertMessage(m Message) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO messages (id, chat_jid, sender_jid, sender_name, body, timestamp, type)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		m.ID, m.ChatJID, m.SenderJID, m.SenderName, m.Body, m.Timestamp, m.Type,
	)
	return err
}

func (s *MessageStore) ListMessages(chatJID string, limit int, after, before *time.Time) ([]Message, error) {
	query := `SELECT id, chat_jid, sender_jid, sender_name, body, timestamp, type FROM messages WHERE chat_jid = ?`
	args := []any{chatJID}

	if after != nil {
		query += ` AND timestamp >= ?`
		args = append(args, after.Unix())
	}
	if before != nil {
		query += ` AND timestamp <= ?`
		args = append(args, before.Unix())
	}
	query += ` ORDER BY timestamp DESC LIMIT ?`
	args = append(args, limit)

	return s.queryMessages(query, args...)
}

func (s *MessageStore) SearchMessages(text string, chatJID string, limit int) ([]Message, error) {
	// Use FTS5 for full-text search
	query := `SELECT m.id, m.chat_jid, m.sender_jid, m.sender_name, m.body, m.timestamp, m.type
		FROM messages m
		JOIN messages_fts f ON m.rowid = f.rowid
		WHERE messages_fts MATCH ?`
	args := []any{escapeFTS(text)}

	if chatJID != "" {
		query += ` AND m.chat_jid = ?`
		args = append(args, chatJID)
	}
	query += ` ORDER BY m.timestamp DESC LIMIT ?`
	args = append(args, limit)

	return s.queryMessages(query, args...)
}

func (s *MessageStore) queryMessages(query string, args ...any) ([]Message, error) {
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.ChatJID, &m.SenderJID, &m.SenderName, &m.Body, &m.Timestamp, &m.Type); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []Message{}
	}
	return msgs, rows.Err()
}

func escapeFTS(s string) string {
	// Wrap each word in quotes for exact matching
	words := strings.Fields(s)
	for i, w := range words {
		words[i] = `"` + strings.ReplaceAll(w, `"`, `""`) + `"`
	}
	return strings.Join(words, " ")
}
