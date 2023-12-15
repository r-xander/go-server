package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		workDir, _ := os.Getwd()
		http.ServeFile(w, r, filepath.Join(workDir, "views/index.html"))
	})

	// filesDir := http.Dir(filepath.Join(workDir, "views"))
	// FileServer(r, "/files", filesDir)

	http.ListenAndServe(":42069", r)
}

// func FileServer(r chi.Router, path string, root http.FileSystem) {
// 	if strings.ContainsAny(path, "{}*") {
// 		panic("FileServer does not permit any URL parameters.")
// 	}

// 	if path != "/" && path[len(path)-1] != '/' {
// 		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
// 		path += "/"
// 	}
// 	path += "*"

// 	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
// 		rctx := chi.RouteContext(r.Context())
// 		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
// 		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
// 		fs.ServeHTTP(w, r)
// 	})
// }
