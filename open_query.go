package main

import "net/http"

func openQueries(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("fukcaduckadoo"))
}
