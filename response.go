package main

import (
	"fmt"
	"net/http"
)

func errorResponse(w http.ResponseWriter, message string, code int) {
	errElement := fmt.Sprintf("<span style='color:red;font-weight:bold;'>%s</span>", message)
	http.Error(w, errElement, code)
}
