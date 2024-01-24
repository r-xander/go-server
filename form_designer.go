package main

import (
	"fmt"
	"html/template"
	"net/http"
)

func formDesignerIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("views/index.html", "views/form_designer.html")
	if err != nil {
		fmt.Printf("[ERROR]: Form designer template parsing error: %v\n", err)
	}

	if err = tmpl.Execute(w, []string{"This", "That", "The Other"}); err != nil {
		fmt.Printf("[ERROR]: Form designer template execution error: %v\n", err)
	}
}
