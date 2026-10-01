#!/usr/bin/env python3
"""Make ControlNet line-art maps from images/croia_00.svg (run after src/face.js).
Writes sd/croia_00_lineart.svg (black on white) and sd/croia_00_lineart_inverted.svg;
render them to PNG with src/render.js."""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(here, '..', 'images', 'croia_00.svg')).read()
s = re.sub(r'<rect width="1024" height="1024" filter="url\(#grain\)"/>', '', s)  # grain layer
s = re.sub(r'<ellipse cx="512" cy="470"[^>]*/>', '', s)                         # background glow
s = re.sub(r'\sfilter="url\(#[a-z0-9]+\)"', '', s)
s = re.sub(r'fill="(?!none|#1e1a18)[^"]*"', 'fill="#ffffff"', s)
s = s.replace('stroke="#f4ead6"', 'stroke="#ffffff"')
sd = os.path.join(here, '..', 'sd')
open(os.path.join(sd, 'croia_00_lineart.svg'), 'w').write(s)
open(os.path.join(sd, 'croia_00_lineart_inverted.svg'), 'w').write(
    s.replace('fill="#ffffff"', 'fill="#000000"').replace('#1e1a18', '#ffffff'))
