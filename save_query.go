package main

import (
	"fmt"
	"html/template"
	"net/http"
)

func saveQuery(w http.ResponseWriter, r *http.Request) {

	t, _ := template.ParseFiles("views/save_popup.html")
	if err := t.Execute(w, nil); err != nil {
		fmt.Printf("Error decoding element: %s", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
