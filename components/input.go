package main

type TInput struct {
	Name        string
	MinLength   int
	MaxLength   int
	Required    bool
	Placeholder string
	Label       string
	Id          string
	Disabled    bool
	ReadOnly    bool
	AutoFocus   bool
}

func (i TInput) Html() string {
	return `
		<input type="text" name="name" placeholder="name">
		<input type="text" name="age" placeholder="age">
		<input type="text" name="email" placeholder="email">
		<input type="submit" value="submit">
	`
}
