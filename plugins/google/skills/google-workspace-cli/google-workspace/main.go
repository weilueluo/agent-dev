package main

import (
	"context"
	"os"
)

func main() {
	app := newApp(os.Stdout, os.Stderr, newGoogleServices)
	os.Exit(app.run(context.Background(), os.Args[1:]))
}
