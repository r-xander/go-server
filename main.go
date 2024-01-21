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

	//go:embed public/assets
	assets   embed.FS
	assetsFS = http.FileServer(http.FS(assets))
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
	FileServer(r, "/public/assets", assetsFS)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, indexView)
	})

	r.Get("/settings", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("<h1>SETTINGS</h1>"))
	})

	r.Post("/run", processQuery)
	r.Get("/query/open", openQueries)
	r.Get("/query/save", saveQuery)

	err = http.ListenAndServe(":42069", r)
	fmt.Printf("[ERROR]: Server stopped with error: %v", err)
}

func FileServer(r chi.Router, path string, root http.Handler) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		root.ServeHTTP(w, r)
	})
}
