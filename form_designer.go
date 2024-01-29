package main

import (
	"fmt"
	"html/template"
	"net/http"
)

type fields []fields

type field struct {
	Name string
	Icon string
}

func formDesignerIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.New("index.html").Funcs(template.FuncMap{
		"loop": func(slice []field, n int) <-chan field {
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
	}).ParseFiles("views/index.html", "views/form_designer.html")

	if err != nil {
		fmt.Printf("[ERROR]: Form designer template parsing error: %v\n", err)
	}

	fields := []field{
		{
			Name: "Text",
			Icon: "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVR4nO3WwQlAIQwD0Ow/kF4Fca44glFL4X/zoEcTaC8C9qoBgEHTd4oZPLLVAzX4O8UVQAsoXuVsO77hLRenoW+chV51FnrVWfjEqmv0/0rVheIip9nvTUF9jORfDBpKAAAAAElFTkSuQmCC",
		},
		{
			Name: "Number",
			Icon: "iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAAACXBIWXMAAAsTAAALEwEAmpwYAAABCUlEQVR4nO3UzysFURjG8Q+um6vsKEWUFVayuJSwuHss/NiwsZANpRuJ2JEUJVLW/lFNncWkM9ecmrtQ861Tc955zzyd533foaYm0MAphqSxgjvcYrNX4hLe8Y3RBIFDHGMw7PdwHkucDTfIEu8TRR4jsde/DqWKNCKxt6pF8ozhBDsSRTILt9DFds77PJO4xkco/nyKSBNfWMMIVvGJ4R7nB/AchEuJHGDj1/t17Obq0Yp8o439siILEXumcRaex3FT0NbtsiIxupjL7S/CnLSCvVn9HpSY3qKJ7+AoEl/GFS4j9iaxGDqnb8wEC2LtWwlTeCmY7EqYCP+hpj6SDd9TZGUdVfNP+QG+Xx876nmi0wAAAABJRU5ErkJggg==",
		},
		{
			Name: "Select",
			Icon: "iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAAAsTAAALEwEAmpwYAAABFElEQVR4nO3YQUrDUBSG0X8bdkt1OVoXoNuqA4sbsg50VHlwB1KsFu6TEnoOBELSQbi8NI8vAQAAWILbJNsk70n2db6+9EMtxVOSw4nj8dIPt4SVNwb1keQuyU0d93Vt3LMSf/FcQxrDO7ape+N15oS3GtJYdcNrkl2dr+re+M1PDgs8/n2AuyQvBni+bQ1w/Ocde/AK/2397SOyqdd2VcP79BE5z9iq2MZMWInb2kTvbaQBAK6GoNogqDYIqk2CapOg2iSoNgmqTYLqBILqBIIqALBQemCDHtigBzbpgU16YJMe2KQHNumBE+iBE+iBAADXSVBtEFQbBNUmQbVJUG0SVJsE1SZBdQJBdQJBFQAAIJf0BXnJO4NO920AAAAAAElFTkSuQmCC",
		},
	}

	if err = tmpl.Execute(w, fields); err != nil {
		fmt.Printf("[ERROR]: Form designer template execution error: %v\n", err)
	}
}
