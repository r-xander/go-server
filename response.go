package main

import (
	"net/http"
)

func errorResponse(w http.ResponseWriter, message string, code int) {
	errElement := "<span style='color:#ff6868;font-weight:bold;'>" + message + "</span>"
	http.Error(w, errElement, code)
}
