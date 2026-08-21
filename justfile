# Theme dev tasks. Run `just` to list.

# Preview the theme via its exampleSite.
serve:
    hugo serve --source exampleSite --themesDir ../.. -D

# Format everything treefmt knows about (.org excluded, no safe formatter for it).
fmt:
    treefmt

# Install git hooks (formatting on commit, a11y check on push).
setup:
    pre-commit install --hook-type pre-commit --hook-type pre-push

# a11y lint against the exampleSite build (Go templates aren't valid HTML pre-render).
# Output lands at themes/emacs/public/ (gitignored), one level above exampleSite/.
a11y:
    hugo --source exampleSite --themesDir ../.. --minify -d ../public
    htmlhint --config .htmlhintrc "public/**/*.html"
