{{- $page := site.GetPage "/wander" -}}
{{- $dts := findRE `<dt>(?s:.*?)</dt>` $page.Content -}}
{{- $consoles := split ($page.Params.wanderconsoles | default "") "|" -}}
const wander = { consoles:
[{{ range $consoles }}
  {{ if . }}{{ (index (split . "::") 0) | jsonify }},{{ end }}
{{ end }}],
pages:
[{{ range $i, $dt := $dts }}
  {{ $url := $dt | replaceRE `(?s).*<a href="?([^ ">]+)"?.*` "$1" }}{{ $url | jsonify }},
{{ end }}],
styles: ["wander-theme.css"], ignore: [], }
