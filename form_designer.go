package main

import (
	"fmt"
	"html/template"
	"net/http"
)

func formDesignerIndex(w http.ResponseWriter, r *http.Request) {
	tmpl := template.New("index.html")
	var err error

	tmpl, err = tmpl.ParseFiles("views/index.html", "views/nav.html", "views/form_designer/form_designer.html")
	if err != nil {
		fmt.Printf("[ERROR]: Form designer template parsing error: %v\n", err)
	}

	tmpl, err = tmpl.ParseGlob("views/form_designer/components/*.html")
	if err != nil {
		fmt.Printf("[ERROR]: Form designer template parsing error: %v\n", err)
	}

	if err = tmpl.Execute(w, nil); err != nil {
		fmt.Printf("[ERROR]: Form designer template execution error: %v\n", err)
	}
}
