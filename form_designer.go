package main

import (
	"fmt"
	"html/template"
	"net/http"
)

type fields []field

type field struct {
	Name string
	Svg  Svg
}

type Svg struct {
	ViewBox string
	Path    string
}

func formDesignerIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.New("index.html").Funcs(template.FuncMap{
		"loop": func(slice fields, n int) <-chan field {
			ch := make(chan field)
			go func() {
				for i := 0; i < n; i++ {
					for j := 0; j < len(slice); j++ {
						ch <- slice[j]
					}
				}
				close(ch)
			}()
			return ch
		},
	}).ParseFiles("views/index.html", "views/form_designer/form_designer.html")
	tmpl, err = tmpl.ParseGlob("views/form_designer/components/*.html")

	if err != nil {
		fmt.Printf("[ERROR]: Form designer template parsing error: %v\n", err)
	}

	fields := fields{
		{
			Name: "Text",
			Svg: Svg{
				ViewBox: "0 0 14 20",
				Path:    "M14 2v4h-2v-2h-4v12h2v2h-6v-2h2v-12h-4v2h-2v-4h11z",
			},
		},
		{
			Name: "Number",
			Svg: Svg{
				ViewBox: "0 0 1024 1024",
				Path:    "M872 394c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8H708V152c0-4.4-3.6-8-8-8h-64c-4.4 0-8 3.6-8 8v166H400V152c0-4.4-3.6-8-8-8h-64c-4.4 0-8 3.6-8 8v166H152c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h168v236H152c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h168v166c0 4.4 3.6 8 8 8h64c4.4 0 8-3.6 8-8V706h228v166c0 4.4 3.6 8 8 8h64c4.4 0 8-3.6 8-8V706h164c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8H708V394h164zM628 630H400V394h228v236z",
			},
		},
		{
			Name: "Select",
			Svg: Svg{
				ViewBox: "0 0 24 24",
				Path:    "M2.625 6.75C2.625 6.12868 3.12868 5.625 3.75 5.625C4.37132 5.625 4.875 6.12868 4.875 6.75C4.875 7.37132 4.37132 7.875 3.75 7.875C3.12868 7.875 2.625 7.37132 2.625 6.75ZM7.5 6.75C7.5 6.33579 7.83579 6 8.25 6H20.25C20.6642 6 21 6.33579 21 6.75C21 7.16421 20.6642 7.5 20.25 7.5H8.25C7.83579 7.5 7.5 7.16421 7.5 6.75ZM2.625 12C2.625 11.3787 3.12868 10.875 3.75 10.875C4.37132 10.875 4.875 11.3787 4.875 12C4.875 12.6213 4.37132 13.125 3.75 13.125C3.12868 13.125 2.625 12.6213 2.625 12ZM7.5 12C7.5 11.5858 7.83579 11.25 8.25 11.25H20.25C20.6642 11.25 21 11.5858 21 12C21 12.4142 20.6642 12.75 20.25 12.75H8.25C7.83579 12.75 7.5 12.4142 7.5 12ZM2.625 17.25C2.625 16.6287 3.12868 16.125 3.75 16.125C4.37132 16.125 4.875 16.6287 4.875 17.25C4.875 17.8713 4.37132 18.375 3.75 18.375C3.12868 18.375 2.625 17.8713 2.625 17.25ZM7.5 17.25C7.5 16.8358 7.83579 16.5 8.25 16.5H20.25C20.6642 16.5 21 16.8358 21 17.25C21 17.6642 20.6642 18 20.25 18H8.25C7.83579 18 7.5 17.6642 7.5 17.25Z",
			},
		},
	}

	if err = tmpl.Execute(w, fields); err != nil {
		fmt.Printf("[ERROR]: Form designer template execution error: %v\n", err)
	}
}
