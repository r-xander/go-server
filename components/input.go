package components

import (
	"bytes"
	"fmt"
)

type InputType int

const (
	Text InputType = iota
	Number
	Email
	None
)

type InputAttributes struct {
	Id          string `html:"shitty"`
	Name        string `html:"shitty"`
	Placeholder string `html:"shitty"`
	MinLength   int    `html:"shitty"`
	MaxLength   int    `html:"shitty"`
	Label       string `html:"shitty"`
	Required    bool   `html:"shitty"`
	Disabled    bool   `html:"shitty"`
	ReadOnly    bool   `html:"shitty"`
	AutoFocus   bool   `html:"shitty"`
}

func (attrs *InputAttributes) Parse(w bytes.Buffer) {
	w.WriteString(fmt.Sprintf(" id=\"%s\"", attrs.Id))
	w.WriteString(fmt.Sprintf(" name=\"%s\"", attrs.Name))
	w.WriteString(fmt.Sprintf(" placeholder=\"%s\"", attrs.Placeholder))
	w.WriteString(fmt.Sprintf(" min=\"%d\"", attrs.MinLength))
	w.WriteString(fmt.Sprintf(" max=\"%d\"", attrs.MaxLength))
}

func Input(w bytes.Buffer, inpType InputType, attrs InputAttributes) {
	w.Write([]byte("<input"))

	switch inpType {
	case Text:
		w.Write([]byte(" type=\"text\""))
	case Number:
		w.Write([]byte(" type=\"number\""))
	case Email:
		w.Write([]byte(" type=\"email\""))
	case None:
		break
	}

	attrs.Parse(w)

	w.WriteString(" />")
}
