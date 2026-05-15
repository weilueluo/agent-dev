package main

import "regexp"

var secretPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(access[_-]?token|refresh[_-]?token|client[_-]?secret|service[_-]?account|api[_-]?key|authorization)\s*[:=]\s*["']?[^"',\s]+`),
	regexp.MustCompile(`ya29\.[A-Za-z0-9._-]+`),
	regexp.MustCompile(`sbp_[A-Za-z0-9._-]+`),
}

func redactString(input string) string {
	output := input
	for _, pattern := range secretPatterns {
		output = pattern.ReplaceAllStringFunc(output, func(match string) string {
			return pattern.ReplaceAllString(match, `$1=[REDACTED]`)
		})
	}
	return output
}
