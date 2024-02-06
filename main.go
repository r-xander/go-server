package main

import (
	"embed"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	//go:embed css
	css   embed.FS
	cssFS = http.FileServer(http.FS(css))

	//go:embed js
	js   embed.FS
	jsFS = http.FileServer(http.FS(js))

	//go:embed assets
	assets   embed.FS
	assetsFS = http.FileServer(http.FS(assets))
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	FileServer(r, "/css", cssFS)
	FileServer(r, "/js", jsFS)
	FileServer(r, "/assets", assetsFS)

	r.Get("/", GetIndex)
	r.Get("/settings", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("<h1>SETTINGS</h1>"))
	})

	r.Post("/run", processQuery)
	r.Post("/csv", processQuery)
	r.Get("/query/open", openQueries)
	r.Get("/query/save", saveQuery)
	r.Get("/form_designer", formDesignerIndex)

	err := http.ListenAndServe(":42069", r)
	fmt.Printf("[ERROR]: Server shutdown with error: %v", err)
}

func GetIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("views/query_index.html", "views/query_screen.html")
	if err != nil {
		// TODO: do something
		return
	}

	if err = tmpl.Execute(w, nil); err != nil {
		// TODO: do something
	}
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
