package config

import "github.com/fatih/color"

var Banner = `
███╗   ███╗ █████╗ ██████╗  █████╗  ██████╗██╗  ██╗███████╗
████╗ ████║██╔══██╗██╔══██╗██╔══██╗██╔════╝██║  ██║██╔════╝
██╔████╔██║███████║██████╔╝███████║██║     ███████║█████╗  
██║╚██╔╝██║██╔══██║██╔═══╝ ██╔══██║██║     ██╔══██║██╔══╝  
██║ ╚═╝ ██║██║  ██║██║     ██║  ██║╚██████╗██║  ██║███████╗
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝
`

func PrintStartupBanner() {
	banner := color.New(color.Bold, color.FgHiMagenta).PrintlnFunc()
	banner(Banner)
	version := color.New(color.Bold, color.FgMagenta).PrintlnFunc()
	version("Running v" + Version + " [ENV: " + Env + "]")
	println()
}
