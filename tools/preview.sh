#!/bin/sh
# Собирает body-only версию index.html для превью в Claude Artifacts.
# Для обычного хостинга не нужен: публикуйте папку как есть.
cd "$(dirname "$0")/.." || exit 1
out="${1:-.preview/index.html}"
mkdir -p "$(dirname "$out")"
grep -viE '^\s*(<!doctype|<html|</html>|<head>|</head>|<body>|</body>|<meta charset|<meta name="viewport")' index.html > "$out"
echo "$out"
