package main

import (
	"embed"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	//go:embed public/css
	css   embed.FS
	cssFS = http.FileServer(http.FS(css))

	//go:embed public/js
	js   embed.FS
	jsFS = http.FileServer(http.FS(js))
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	workDir, err := os.Getwd()

	if err != nil {
		fmt.Printf("Could not get working directory: %s", err.Error())
	}

	indexView := filepath.Join(workDir, "views/index.html")
	FileServer(r, "/public/css", cssFS)
	FileServer(r, "/public/js", jsFS)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, indexView)
	})

	// r.Get("/css/*", func(w http.ResponseWriter, r *http.Request) {
	// 	cssFS.ServeHTTP(w, r)
	// })

	// r.Get("/js/*", func(w http.ResponseWriter, r *http.Request) {
	// 	jsFS.ServeHTTP(w, r)
	// })

	r.Post("/run", processQuery)

	http.ListenAndServe(":42069", r)
}

func FileServer(r chi.Router, path string, root http.Handler) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
		fmt.Printf("Path: %s\n", path)
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		root.ServeHTTP(w, r)
	})
}
