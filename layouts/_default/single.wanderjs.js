{{- /* consoles vs pages are both dt/dl groups in content/wander.org, split
  by H2 exactly like topic-list.html — whichever group's H2 label contains
  "console" feeds the consoles: array, everything else feeds pages:. */ -}}
{{- $page := site.GetPage "/wander" -}}
{{- $chunks := split $page.Content "<h2" -}}
{{- $consoleURLs := slice -}}
{{- $pageURLs := slice -}}
{{- range after 1 $chunks -}}
  {{- $chunk := . -}}
  {{- $label := $chunk | replaceRE `(?s)^[^>]*>(.*?)</h2>.*` "$1" | replaceRE `<[^>]+>` "" | strings.TrimSpace | lower -}}
  {{- range findRE `<dt>(?s:.*?)</dt>` $chunk -}}
    {{- $url := partial "extract-href.html" . -}}
    {{- if strings.Contains $label "console" -}}
      {{- $consoleURLs = $consoleURLs | append $url -}}
    {{- else -}}
      {{- $pageURLs = $pageURLs | append $url -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
const wander = { consoles:
[{{ range $consoleURLs }}
  {{ . | jsonify }},
{{ end }}],
pages:
[{{ range $pageURLs }}
  {{ . | jsonify }},
{{ end }}],
styles: ["wander-theme.css"], ignore: [], }
