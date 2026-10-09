"""Dibuja el TopoJSON generado para revisar huecos y colores.
Uso: python3 -I preview.py <topo.json> <salida.png> [lon0 lon1 lat0 lat1]
"""
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib.collections import PatchCollection

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


def ring(refs):
    out = []
    for r in refs:
        pts = arcs[r] if r >= 0 else arcs[~r][::-1]
        out.extend(pts if not out else pts[1:])
    return out


owner = {}
if len(sys.argv) > 7:
    owner = dict(kv.split("=") for kv in sys.argv[7].split(","))

patches, colors = [], []
paises = topo["paises"]
for g in topo["objects"]["regiones"]["geometries"]:
    polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
    c = owner.get(g["properties"]["n"], g["properties"]["c"])
    for poly in polys:
        patches.append(Polygon(ring(poly[0]), closed=True))
        colors.append(paises[c]["k"])

fig, ax = plt.subplots(figsize=(16, 8.5), dpi=110)
ax.set_facecolor("#E4ECF2")
pc = PatchCollection(patches, facecolors=colors, edgecolors="#FFFFFF", linewidths=0.15)
ax.add_collection(pc)
if len(sys.argv) > 6:
    lon0, lon1, lat0, lat1 = map(float, sys.argv[3:7])
else:
    lon0, lon1, lat0, lat1 = -180, 180, -60, 84
ax.set_xlim(lon0, lon1)
ax.set_ylim(lat0, lat1)
ax.set_aspect("equal")
ax.set_xticks([])
ax.set_yticks([])
plt.tight_layout()
plt.savefig(sys.argv[2])
