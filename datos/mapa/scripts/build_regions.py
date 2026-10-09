"""Construye el TopoJSON del mapa de Concordia por regiones.

- Países activos: sus provincias se fusionan en las regiones de regions_map.py.
- Países inactivos: una sola forma por país (se dibujan en gris, sin interacción).
- Las fronteras internas entre provincias de una misma región se eliminan del archivo.

Uso: python3 -I build_regions.py <admin1.geojson> <admin0.geojson> <salida.json> [tolerancia_grados]
"""
import json
import math
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from regions_map import ACTIVE, COLORS, region_of  # noqa: E402

SRC, ADMIN0, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TOL_DEG = float(sys.argv[4]) if len(sys.argv) > 4 else 0.03
Q = 0.002
SPAN = 200000
TOL = TOL_DEG / Q
EXCLUDE = {"ATA"}


def enc(x, y):
    return x * SPAN + y


def dec(k):
    return divmod(k, SPAN)


def quant_ring(ring):
    out = []
    for lon, lat in ring:
        lon = max(-180.0, min(180.0, lon))
        lat = max(-90.0, min(90.0, lat))
        k = enc(round((lon + 180) / Q), round((lat + 90) / Q))
        if not out or out[-1] != k:
            out.append(k)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    changed = True
    while changed and len(out) >= 3:
        changed = False
        n = len(out)
        for i in range(n):
            if out[(i - 1) % n] == out[(i + 1) % n]:
                del out[i]
                if i < len(out):
                    del out[i % len(out)]
                changed = True
                break
    return out if len(set(out)) >= 3 else None


def load():
    data = json.load(open(SRC))
    feats = []
    for f in data["features"]:
        p = f["properties"]
        c = p.get("adm0_a3")
        if c in EXCLUDE or f["geometry"] is None:
            continue
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        qpolys = []
        for poly in polys:
            rings = []
            for i, ring in enumerate(poly):
                q = quant_ring(ring)
                if q is None:
                    if i == 0:
                        rings = None
                        break
                    continue
                rings.append(q)
            if rings:
                qpolys.append(rings)
        if not qpolys:
            continue
        if c in ACTIVE:
            rid = f"{c}:{region_of(p)}"
        else:
            rid = c
        prov = (p.get("name_es") or p.get("name") or "").strip()
        feats.append({"c": c, "rid": rid, "prov": prov, "polys": qpolys})
    return feats


def find_junctions(feats):
    first_pair, junction = {}, set()
    for f in feats:
        for poly in f["polys"]:
            for ring in poly:
                n = len(ring)
                for i in range(n):
                    k = ring[i]
                    a, b = ring[i - 1], ring[(i + 1) % n]
                    pair = (a, b) if a < b else (b, a)
                    seen = first_pair.get(k)
                    if seen is None:
                        first_pair[k] = pair
                    elif seen != pair:
                        junction.add(k)
    return junction


def canonical(seq):
    rev = seq[::-1]
    return (tuple(seq), False) if tuple(seq) <= tuple(rev) else (tuple(rev), True)


def canonical_closed(ring):
    n = len(ring)
    m = min(range(n), key=lambda i: ring[i])
    fwd = ring[m:] + ring[:m]
    bwd = [fwd[0]] + fwd[1:][::-1]
    if tuple(fwd) <= tuple(bwd):
        return tuple(fwd + [fwd[0]]), False
    return tuple(bwd + [bwd[0]]), True


def build_arcs(feats, junction):
    index, arcs = {}, []

    def add(key, rev):
        i = index.get(key)
        if i is None:
            i = len(arcs)
            index[key] = i
            arcs.append(list(key))
        return ~i if rev else i

    for f in feats:
        f["rings"] = []
        for poly in f["polys"]:
            for ring in poly:
                n = len(ring)
                js = [i for i in range(n) if ring[i] in junction]
                refs = []
                if not js:
                    key, r = canonical_closed(ring)
                    refs.append(add(key, r))
                else:
                    rot = ring[js[0]:] + ring[:js[0]]
                    jset = [i for i in range(n) if rot[i] in junction] + [n]
                    rot.append(rot[0])
                    for a, b in zip(jset, jset[1:]):
                        key, r = canonical(rot[a:b + 1])
                        refs.append(add(key, r))
                f["rings"].append(refs)
    return arcs


def dp(points, tol):
    n = len(points)
    if n <= 2:
        return list(range(n))
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        s, e = stack.pop()
        if e <= s + 1:
            continue
        x1, y1 = points[s]
        x2, y2 = points[e]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for i in range(s + 1, e):
            px, py = points[i]
            d = math.hypot(px - x1, py - y1) if L == 0 else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / L
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack.append((s, bi))
            stack.append((bi, e))
    return [i for i in range(n) if keep[i]]


def simplify(arc, tol):
    pts = [dec(k) for k in arc]
    if arc[0] == arc[-1]:
        x0, y0 = pts[0]
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
        idx = sorted(set(dp(pts[: far + 1], tol) + [far + i for i in dp(pts[far:], tol)]))
        if len(idx) < 4:
            n = len(pts) - 1
            idx = sorted({0, n // 3, (2 * n) // 3, n})
    else:
        idx = dp(pts, tol)
    return [pts[i] for i in idx]


def merge_regions(feats, arcs):
    """Une las provincias de cada región: quita los arcos internos y vuelve a coser los anillos."""
    refs_by_region = defaultdict(list)
    provs = defaultdict(list)
    country = {}
    for f in feats:
        country[f["rid"]] = f["c"]
        if f["prov"] and f["prov"] not in provs[f["rid"]]:
            provs[f["rid"]].append(f["prov"])
        for ring in f["rings"]:
            refs_by_region[f["rid"]].extend(ring)

    regions = {}
    for rid, refs in refs_by_region.items():
        count = defaultdict(int)
        for r in refs:
            count[r if r >= 0 else ~r] += 1
        boundary = [i for i, n in count.items() if n % 2 == 1]
        # adyacencia por extremos (sin dirección, por si los anillos vienen con distinto sentido)
        closed = [i for i in boundary if arcs[i][0] == arcs[i][-1]]
        open_ = [i for i in boundary if arcs[i][0] != arcs[i][-1]]
        at = defaultdict(list)
        for i in open_:
            at[arcs[i][0]].append(i)
            at[arcs[i][-1]].append(i)
        used = set()
        rings = [[i] for i in closed]
        for start in open_:
            if start in used:
                continue
            used.add(start)
            ring = [start]
            origin = arcs[start][0]
            point = arcs[start][-1]
            guard = 0
            while point != origin and guard < 100000:
                guard += 1
                nxt = next((j for j in at[point] if j not in used), None)
                if nxt is None:
                    break
                used.add(nxt)
                if arcs[nxt][0] == point:
                    ring.append(nxt)
                    point = arcs[nxt][-1]
                else:
                    ring.append(~nxt)
                    point = arcs[nxt][0]
            rings.append(ring)
        regions[rid] = {"rings": rings, "c": country[rid], "provs": provs[rid]}
    return regions


def main():
    feats = load()
    print("provincias:", len(feats))
    junction = find_junctions(feats)
    arcs = build_arcs(feats, junction)
    regions = merge_regions(feats, arcs)
    print("regiones:", len(regions), "activas:", sum(1 for r in regions if ":" in r))

    # solo los arcos que quedan en algún borde de región
    used = sorted({(r if r >= 0 else ~r) for reg in regions.values() for ring in reg["rings"] for r in ring})
    remap = {old: new for new, old in enumerate(used)}
    out_arcs = []
    for old in used:
        pts = simplify(arcs[old], TOL)
        enc_a, px, py = [], 0, 0
        for x, y in pts:
            enc_a.append([x - px, y - py])
            px, py = x, y
        out_arcs.append(enc_a)
    print("arcos:", len(out_arcs), "puntos:", sum(len(a) for a in out_arcs))

    a0 = json.load(open(ADMIN0))
    names = {}
    for f in a0["features"]:
        p = f["properties"]
        for code in {p.get("ADM0_A3"), p.get("SOV_A3")}:
            if code and code not in names:
                names[code] = p.get("NAME_ES") or p.get("NAME")

    geoms = []
    order = sorted(regions, key=lambda r: (":" not in r, r))
    for rid in order:
        reg = regions[rid]
        rings = [[(remap[r] if r >= 0 else ~remap[~r]) for r in ring] for ring in reg["rings"]]
        props = {"c": reg["c"]}
        if ":" in rid:
            props["n"] = rid.split(":", 1)[1]
            props["p"] = reg["provs"]
        geoms.append({"type": "Polygon", "arcs": rings, "properties": props})

    paises = {}
    for reg in regions.values():
        c = reg["c"]
        if c not in paises:
            entry = {"n": names.get(c) or c}
            if c in ACTIVE:
                entry["k"] = COLORS[c]
                entry["on"] = 1
            paises[c] = entry

    topo = {
        "type": "Topology",
        "transform": {"scale": [Q, Q], "translate": [-180, -90]},
        "objects": {"regiones": {"type": "GeometryCollection", "geometries": geoms}},
        "arcs": out_arcs,
        "paises": paises,
    }
    s = json.dumps(topo, ensure_ascii=False, separators=(",", ":"))
    open(OUT, "w").write(s)
    print("países:", len(paises), "activos:", sum(1 for p in paises.values() if p.get("on")),
          "tamaño:", round(len(s.encode()) / 1e6, 2), "MB")


main()
