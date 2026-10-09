"""Une template.html y mapa.js en una sola página (script en línea)."""
import sys
site = sys.argv[1]
t = open(f"{site}/template.html").read()
js = open(f"{site}/mapa.js").read()
tag = '<script src="mapa.js"></script>'
assert tag in t
open(f"{site}/mapa-concordia.html", "w").write(t.replace(tag, "<script>\n" + js + "</script>"))
print("ok")
