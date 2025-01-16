package components

type Component interface {
	Html() string
	JSCreateFunc() string
}
