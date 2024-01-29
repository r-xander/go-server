package main

type Component interface {
	Html() string
	JSCreateFunc() string
}
