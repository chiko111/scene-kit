"""Hand-written Lottie: 5 neon bars bouncing (equalizer), 2 s loop, magenta/cyan. python3 -I make_lottie.py"""
import json, os

OUT = os.path.expanduser('~/Downloads/promo-builder-poc/data/assets/neon-night/equalizer.json')
PINK, CYAN = [1, 0.169, 0.839, 1], [0, 0.941, 1, 1]
W, H, FPS, FRAMES = 200, 120, 30, 60
EASE = {'i': {'x': [0.45, 0.45, 0.45], 'y': [1, 1, 1]}, 'o': {'x': [0.55, 0.55, 0.55], 'y': [0, 0, 0]}}


def static(v):
    return {'a': 0, 'k': v}


def bar(i):
    x = 28 + i * 36
    color = PINK if i % 2 == 0 else CYAN
    heights = [[30, 95, 45, 80, 30], [70, 35, 100, 50, 70], [45, 85, 30, 100, 45], [90, 40, 75, 35, 90], [35, 70, 95, 40, 35]][i]
    keys = [dict({'t': t, 's': [100, h, 100]}, **EASE) for t, h in zip((0, 15, 30, 45), heights[:4])]
    keys.append({'t': FRAMES, 's': [100, heights[4], 100]})

    def rect(w, h, opacity):
        return {'ty': 'gr', 'nm': 'bar', 'it': [
            {'ty': 'rc', 'nm': 'r', 'd': 1, 's': static([w, h]), 'p': static([0, -h / 2]), 'r': static(6)},
            {'ty': 'fl', 'nm': 'f', 'c': static(color), 'o': static(opacity), 'r': 1},
            {'ty': 'tr', 'nm': 't', 'p': static([0, 0]), 'a': static([0, 0]), 's': static([100, 100]), 'r': static(0),
             'o': static(100), 'sk': static(0), 'sa': static(0)}]}

    return {'ddd': 0, 'ind': i + 1, 'ty': 4, 'nm': f'bar{i + 1}', 'sr': 1,
            'ks': {'o': static(100), 'r': static(0), 'p': static([x, 112, 0]), 'a': static([0, 0, 0]),
                   's': {'a': 1, 'k': keys}},
            'ao': 0, 'shapes': [rect(30, 100, 25), rect(18, 100, 100)],  # soft halo + bright core
            'ip': 0, 'op': FRAMES, 'st': 0, 'bm': 0}


lottie = {'v': '5.7.4', 'fr': FPS, 'ip': 0, 'op': FRAMES, 'w': W, 'h': H, 'nm': 'equalizer', 'ddd': 0, 'assets': [],
          'layers': [bar(i) for i in range(5)]}
with open(OUT, 'w') as f:
    json.dump(lottie, f, separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
