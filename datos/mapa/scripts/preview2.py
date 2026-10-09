"""Vista previa del TopoJSON por regiones: colores por dueño, inactivos en gris.
Uso: python3 -I preview2.py <topo.json> <salida.png> lon0 lon1 lat0 lat1 [Region=PAIS,...]
"""
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PatchCollection, LineCollection
from matplotlib.patches import Polygon

topo = json.load(open(sys.argv[1]))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
arcs = []
for a in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in a:
        x += dx
        y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
owner = dict(kv.split("=") for kv in sys.argv[7].split(",")) if len(sys.argv) > 7 else {}
P = topo["paises"]
geoms = topo["objects"]["regiones"]["geometries"]
users = [[] for _ in arcs]
patches, colors = [], []
for gi, g in enumerate(geoms):
    pr = g["properties"]
    o = owner.get(pr.get("n", ""), pr["c"]) if pr["c"] == "ARG" or pr.get("n") in owner else pr["c"]
    g["_o"] = o
    for ring in g["arcs"]:
        pts = []
        for r in ring:
            i = r if r >= 0 else ~r
            users[i].append(gi)
            seg = arcs[i] if r >= 0 else arcs[i][::-1]
            pts.extend(seg if not pts else seg[1:])
        patches.append(Polygon(pts, closed=True))
        colors.append(P[o]["k"] if P[o].get("on") else "#D5DAE0")

fig, ax = plt.subplots(figsize=(14, 9), dpi=100)
ax.set_facecolor("#E4ECF2")
ax.add_collection(PatchCollection(patches, facecolors=colors, edgecolors="none"))
country, region, gray = [], [], []
for i, u in enumerate(users):
    a = geoms[u[0]]
    b = geoms[u[1]] if len(u) > 1 else a
    on = P[a["_o"]].get("on") or P[b["_o"]].get("on")
    if a["_o"] != b["_o"] or a is b:
        (country if on else gray).append(arcs[i])
    elif on:
        region.append(arcs[i])
ax.add_collection(LineCollection(gray, colors="#B9C1CB", linewidths=0.5))
ax.add_collection(LineCollection(region, colors="#FFFFFF", linewidths=0.8))
ax.add_collection(LineCollection(country, colors="#14181F", linewidths=0.9))
lon0, lon1, lat0, lat1 = map(float, sys.argv[3:7])
ax.set_xlim(lon0, lon1)
ax.set_ylim(lat0, lat1)
ax.set_aspect("equal")
ax.set_xticks([])
ax.set_yticks([])
plt.tight_layout()
plt.savefig(sys.argv[2])
