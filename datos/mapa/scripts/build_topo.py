"""Construye un TopoJSON liviano de regiones (admin-1) del mundo, con
simplificación que conserva la topología (fronteras compartidas sin huecos),
y asigna un color por país distinto del de sus vecinos.

Uso: python3 -I build_topo.py <admin1.geojson> <admin0.geojson> <salida.json> [tolerancia_grados]
"""
import json
import math
import sys
from collections import defaultdict

SRC, ADMIN0, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TOL_DEG = float(sys.argv[4]) if len(sys.argv) > 4 else 0.03
Q = 0.002  # tamaño de la grilla de cuantización, en grados
SPAN = 200000  # para codificar (x, y) en un solo entero
TOL = TOL_DEG / Q  # tolerancia en unidades de grilla

EXCLUDE = {"ATA"}  # Antártida

# Colores fijos pedidos o reconocibles. El resto se asigna automáticamente.
FIXED = {
    "ARG": "#6CACE4",  # celeste
    "ESP": "#D0453A",  # rojo
}


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
    # quitar picos A-B-A
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
        if p.get("adm0_a3") in EXCLUDE or f["geometry"] is None:
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
        name = (p.get("name_es") or p.get("name") or "").strip() or p.get("admin")
        feats.append({"name": name, "c": p["adm0_a3"], "admin": p.get("admin"), "polys": qpolys,
                      "area": float(p.get("area_sqkm") or 0),
                      "alt": [(p.get("name") or "").strip(), (p.get("name_local") or "").strip()],
                      "type": (p.get("type") or p.get("type_en") or "").strip()})
    # nombres repetidos dentro de un mismo país
    groups = defaultdict(list)
    for f in feats:
        groups[(f["c"], f["name"])].append(f)
    for (c, n), fs in groups.items():
        if len(fs) < 2:
            continue
        for f in fs:
            for a in f["alt"]:
                if a and a != n and all(a != g["name"] for g in feats if g["c"] == c):
                    f["name"] = a
                    break
        names = defaultdict(list)
        for f in fs:
            names[f["name"]].append(f)
        for n2, same in names.items():
            if len(same) > 1:
                for i, f in enumerate(same):
                    f["name"] = f"{n2} ({f['type']})" if f["type"] else f"{n2} {i + 1}"
    return feats


def find_junctions(feats):
    first_pair = {}
    junction = set()
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
    """Devuelve (clave canónica, invertido?) para un arco abierto."""
    rev = seq[::-1]
    if tuple(seq) <= tuple(rev):
        return tuple(seq), False
    return tuple(rev), True


def canonical_closed(ring):
    """Arco cerrado sin uniones: rotar al mínimo y elegir sentido."""
    n = len(ring)
    m = min(range(n), key=lambda i: ring[i])
    fwd = ring[m:] + ring[:m]
    bwd = [fwd[0]] + fwd[1:][::-1]
    if tuple(fwd) <= tuple(bwd):
        return tuple(fwd + [fwd[0]]), False
    return tuple(bwd + [bwd[0]]), True


def build_arcs(feats, junction):
    arc_index = {}
    arcs = []

    def add(key, reversed_):
        idx = arc_index.get(key)
        if idx is None:
            idx = len(arcs)
            arc_index[key] = idx
            arcs.append(list(key))
        return ~idx if reversed_ else idx

    for f in feats:
        f["arcs"] = []
        for poly in f["polys"]:
            prefs = []
            for ring in poly:
                n = len(ring)
                js = [i for i in range(n) if ring[i] in junction]
                refs = []
                if not js:
                    key, r = canonical_closed(ring)
                    refs.append(add(key, r))
                else:
                    start = js[0]
                    rot = ring[start:] + ring[:start]
                    jset = [i for i in range(n) if rot[i] in junction]
                    jset.append(n)
                    rot.append(rot[0])
                    for a, b in zip(jset, jset[1:]):
                        seg = rot[a:b + 1]
                        key, r = canonical(seg)
                        refs.append(add(key, r))
                prefs.append(refs)
            f["arcs"].append(prefs)
    return arcs


def dp(points, tol):
    """Douglas-Peucker iterativo; devuelve índices a conservar."""
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
            if L == 0:
                d = math.hypot(px - x1, py - y1)
            else:
                d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / L
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack.append((s, bi))
            stack.append((bi, e))
    return [i for i in range(n) if keep[i]]


def simplify_arcs(arcs, tol):
    out = []
    for arc in arcs:
        pts = [dec(k) for k in arc]
        closed = arc[0] == arc[-1]
        if closed:
            x0, y0 = pts[0]
            far = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
            a = dp(pts[: far + 1], tol)
            b = [far + i for i in dp(pts[far:], tol)]
            idx = sorted(set(a + b))
            if len(idx) < 4:
                n = len(pts) - 1
                idx = sorted({0, n // 3, (2 * n) // 3, n})
        else:
            idx = dp(pts, tol)
        out.append([pts[i] for i in idx])
    return out, arcs


def fix_degenerate(feats, simp, orig):
    """Si un anillo quedó con menos de 3 puntos distintos, recupera detalle."""
    for _ in range(4):
        bad = 0
        for f in feats:
            for poly in f["arcs"]:
                for ring in poly:
                    pts = set()
                    for r in ring:
                        pts.update(simp[r if r >= 0 else ~r])
                    if len(pts) < 3:
                        bad += 1
                        for r in ring:
                            i = r if r >= 0 else ~r
                            full = [dec(k) for k in orig[i]]
                            simp[i] = [full[j] for j in dp(full, TOL / 8)]
                            if len(simp[i]) == 2 and len(full) > 2:
                                simp[i] = [full[0], full[len(full) // 2], full[-1]]
        if not bad:
            break


def country_table(feats):
    a0 = json.load(open(ADMIN0))
    names = {}
    for f in a0["features"]:
        p = f["properties"]
        for code in {p.get("ADM0_A3"), p.get("SOV_A3"), p.get("ADM0_A3_US")}:
            if code and code not in names:
                names[code] = p.get("NAME_ES") or p.get("NAME")
    table = {}
    for f in feats:
        c = f["c"]
        if c not in table:
            table[c] = {"n": names.get(c) or f["admin"]}
    return table


# ---------- color ----------

def hsl_to_rgb(h, s, l):
    c = (1 - abs(2 * l - 1)) * s
    hp = (h % 360) / 60
    x = c * (1 - abs(hp % 2 - 1))
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(hp) % 6]
    m = l - c / 2
    return (r + m, g + m, b + m)


def rgb_to_lab(rgb):
    def lin(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = map(lin, rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{round(max(0, min(1, v)) * 255):02X}" for v in rgb)


def de(a, b):
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(a, b)))


def assign_colors(table, feats, arcs_count):
    # vecindad entre países a partir de arcos compartidos
    users = defaultdict(set)
    for f in feats:
        for poly in f["arcs"]:
            for ring in poly:
                for r in ring:
                    users[r if r >= 0 else ~r].add(f["c"])
    nb = defaultdict(set)
    for cs in users.values():
        if len(cs) > 1:
            for a in cs:
                nb[a] |= cs - {a}

    # candidatos: tonos medios, saturación moderada, legibles sobre el océano claro
    cands = []
    for h in range(0, 360, 6):
        for s, l in ((0.40, 0.64), (0.32, 0.73), (0.36, 0.54)):
            rgb = hsl_to_rgb(h, s, l)
            cands.append((rgb_to_hex(rgb), rgb_to_lab(rgb)))
    ocean = rgb_to_lab(hex_to_rgb("#E4ECF2"))
    cands = [c for c in cands if de(c[1], ocean) > 22]

    colors = {c: v for c, v in FIXED.items() if c in table}
    labs = {c: rgb_to_lab(hex_to_rgb(v)) for c, v in colors.items()}
    used = defaultdict(int)
    area = defaultdict(float)
    for f in feats:
        area[f["c"]] += f["area"]
    order = sorted(table, key=lambda c: (-area[c], c))
    for c in order:
        if c in colors:
            continue
        best, bestscore = None, -1e9
        for hx, lab in cands:
            near = [labs[n] for n in nb[c] if n in labs]
            # vecinos de segundo grado también cuentan, con menos peso
            near2 = [labs[m] for n in nb[c] for m in nb[n] if m in labs and m != c and m not in nb[c]]
            d1 = min((de(lab, x) for x in near), default=100)
            d2 = min((de(lab, x) for x in near2), default=100)
            fixed_d = min(de(lab, l) for k, l in labs.items() if k in FIXED)
            crowd = sum(1 for k, l in labs.items() if de(lab, l) < 11)
            score = d1 + 0.35 * min(d2, 40) - 30 * used[hx] - 6 * crowd + 0.15 * min(fixed_d, 30) - (40 if fixed_d < 28 else 0)
            if score > bestscore:
                best, bestscore = (hx, lab), score
        colors[c] = best[0]
        labs[c] = best[1]
        used[best[0]] += 1
    return colors, nb


def main():
    feats = load()
    print("regiones:", len(feats))
    junction = find_junctions(feats)
    arcs = build_arcs(feats, junction)
    print("arcos:", len(arcs), "puntos originales:", sum(len(a) for a in arcs))
    simp, orig = simplify_arcs(arcs, TOL)
    fix_degenerate(feats, simp, orig)
    print("puntos simplificados:", sum(len(a) for a in simp))

    table = country_table(feats)
    colors, nb = assign_colors(table, feats, len(arcs))
    for c in table:
        table[c]["k"] = colors[c]

    # TopoJSON con arcos delta-codificados
    out_arcs = []
    for a in simp:
        enc_a, px, py = [], 0, 0
        for x, y in a:
            enc_a.append([x - px, y - py])
            px, py = x, y
        out_arcs.append(enc_a)

    geoms = []
    for i, f in enumerate(feats):
        if len(f["arcs"]) == 1:
            g = {"type": "Polygon", "arcs": f["arcs"][0]}
        else:
            g = {"type": "MultiPolygon", "arcs": f["arcs"]}
        g["id"] = i
        g["properties"] = {"n": f["name"], "c": f["c"]}
        geoms.append(g)

    topo = {
        "type": "Topology",
        "transform": {"scale": [Q, Q], "translate": [-180, -90]},
        "objects": {"regiones": {"type": "GeometryCollection", "geometries": geoms}},
        "arcs": out_arcs,
        "paises": table,
    }
    s = json.dumps(topo, ensure_ascii=False, separators=(",", ":"))
    open(OUT, "w").write(s)
    print("países:", len(table), "tamaño:", round(len(s.encode()) / 1e6, 2), "MB")
    print("ARG", colors.get("ARG"), "ESP", colors.get("ESP"), "URY", colors.get("URY"), "CHL", colors.get("CHL"))


main()
