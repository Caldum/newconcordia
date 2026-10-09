"""Banderas simplificadas 4:3 (viewBox 0 0 640 480) para los países de Concordia.
Las de dibujo simple vienen de flag-icons (MIT, Panayiotis Lipiridis); las de escudo
complejo se simplifican para que se lean a 32-56 px."""
import os, re, urllib.parse
FI = os.path.join(os.path.dirname(__file__), 'ext/flags/flag-icons/flags/4x3')

def _fi(c):
    s = open(os.path.join(FI, c + '.svg')).read()
    s = re.sub(r'\s*id="flag-icons-[a-z]+"', '', s)
    inner = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', s, flags=re.S)
    return re.sub(r'>\s+<', '><', inner.strip())

def _star(cx, cy, r, fill):
    import math
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.4
        pts.append('%.1f,%.1f' % (cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return '<polygon fill="%s" points="%s"/>' % (fill, ' '.join(pts))

INNER = {
 'ARG': '<path fill="#74ACDF" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><circle cx="320" cy="240" r="42" fill="#F6B40E" stroke="#85340A" stroke-width="5"/>',
 'BRA': '<path fill="#009C3B" d="M0 0h640v480H0z"/><path fill="#FFDF00" d="M66 240 320 58l254 182-254 182z"/><circle cx="320" cy="240" r="104" fill="#002776"/><path d="M220 214c66-16 140-8 196 30" fill="none" stroke="#fff" stroke-width="16"/>',
 'CHL': _fi('cl'),
 'PRY': '<path fill="#D52B1E" d="M0 0h640v160H0z"/><path fill="#fff" d="M0 160h640v160H0z"/><path fill="#0038A8" d="M0 320h640v160H0z"/><circle cx="320" cy="240" r="48" fill="none" stroke="#3A7D2C" stroke-width="10"/>' + _star(320, 240, 22, '#F2B200'),
 'MEX': '<path fill="#006847" d="M0 0h213.3v480H0z"/><path fill="#fff" d="M213.3 0h213.4v480H213.3z"/><path fill="#CE1126" d="M426.7 0H640v480H426.7z"/><ellipse cx="320" cy="226" rx="44" ry="52" fill="#8C5A2B"/><path d="M262 270c30 40 86 40 116 0" fill="none" stroke="#3A7D2C" stroke-width="12" stroke-linecap="round"/>',
 'USA': _fi('us'),
 'CAN': _fi('ca'),
 'ESP': '<path fill="#AA151B" d="M0 0h640v480H0z"/><path fill="#F1BF00" d="M0 120h640v240H0z"/><rect x="150" y="186" width="76" height="96" rx="12" fill="#AA151B" stroke="#C8A100" stroke-width="8"/><rect x="160" y="160" width="56" height="22" rx="4" fill="#C8A100"/>',
 'PRT': '<path fill="#046A38" d="M0 0h256v480H0z"/><path fill="#DA291C" d="M256 0h384v480H256z"/><circle cx="256" cy="240" r="80" fill="none" stroke="#FFE900" stroke-width="18"/><rect x="220" y="196" width="72" height="88" rx="10" fill="#fff"/><rect x="236" y="212" width="40" height="56" rx="6" fill="#DA291C"/>',
 'FRA': _fi('fr'),
 'ITA': _fi('it'),
 'DEU': _fi('de'),
 'GBR': _fi('gb'),
 'URY': '<path fill="#fff" d="M0 0h640v480H0z"/><path fill="#0038A8" d="M266 53h374v53H266zm0 107h374v53H266zM0 267h640v53H0zm0 106h640v53H0z"/><circle cx="133" cy="133" r="50" fill="#FCD116" stroke="#7B3F00" stroke-width="5"/>',
}

def svg(code, width=None, height=None, extra=''):
    w = ' width="%s"' % width if width else ''
    h = ' height="%s"' % height if height else ''
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"%s%s preserveAspectRatio="xMidYMid slice"%s>%s</svg>' % (w, h, extra, INNER[code])

def datauri(code):
    return 'data:image/svg+xml,' + urllib.parse.quote(svg(code), safe='')

def chip(code, w=48, h=36, r=4):
    """Bandera con borde fino para que el blanco no se pierda sobre blanco."""
    return ('<span style="display:block;width:%dpx;height:%dpx;border-radius:%dpx;overflow:hidden;flex:none;box-shadow:inset 0 0 0 1px rgba(19,32,46,.18);position:relative">'
            '%s<span style="position:absolute;inset:0;border-radius:%dpx;box-shadow:inset 0 0 0 1px rgba(19,32,46,.18)"></span></span>') % (w, h, r, svg(code, '100%', '100%', ' aria-hidden="true" style="display:block"'), r)

if __name__ == '__main__':
    html = '<body style="display:flex;gap:12px;flex-wrap:wrap;padding:20px;background:#fff">' + ''.join('<div style="font:12px sans-serif">%s%s</div>' % (chip(c, 96, 72), c) for c in INNER) + '</body>'
    open('prev/flags.html', 'w').write(html)
