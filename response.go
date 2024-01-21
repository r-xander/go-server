package main

import (
	"net/http"
)

func errorResponse(w http.ResponseWriter, message string, code int) {
	errElement := "<span style='color:red;font-weight:bold;'>" + message + "</span>"
	http.Error(w, errElement, code)
}
