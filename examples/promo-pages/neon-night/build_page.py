"""Builds neon-night.page.json (scene-kit Page v1) from the generated artwork sizes (manifest.json).
Run: python3 -I build_page.py

Sections: hero slider (3 slides) · how to play (arcade cabinets) · prizes (neon plates) · mystery box (tap trigger)
· tournament slots (gameCarousel) · terms. Desktop + mobile variant for every scene / slide.
Units: frames in % of the scene, every other length in "u" = 1% of the scene width.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'neon-night.page.json')
CDN = 'https://ibbgcdn.kubdev.com/common-content/landing-pages/container/neon-night/'
SIZES = {a['name']: (a['width'], a['height']) for a in json.load(open(os.path.join(HERE, 'manifest.json'), encoding='utf-8'))}
SIZES['equalizer'] = (200, 120)  # Lottie canvas


def r2(v):
    return round(v, 2)


# ───────────── node helpers ─────────────

def base(id_, name, x, y, w, h, effects=()):
    return {'id': id_, 'name': name, 'frame': {'x': r2(x), 'y': r2(y), 'w': r2(w), 'h': r2(h), 'rotation': 0},
            'opacity': 1, 'hidden': False, 'shadow': None, 'effects': list(effects)}


def img(id_, name, file, x, y, w, aspect, effects=(), alt='', fit='contain', **extra):
    iw, ih = SIZES[file]
    h = w * aspect / (iw / ih)  # % of scene height keeping the picture's ratio
    n = base(id_, name, x, y, w, h, effects)
    n.update({'type': 'image', 'uri': CDN + file + '.webp', 'fit': fit, 'alt': alt, 'radius': 0}, **extra)
    return n, h


def full(id_, name, file, effects=()):
    n = base(id_, name, 0, 0, 100, 100, effects)
    n.update({'type': 'image', 'uri': CDN + file + '.webp', 'fit': 'cover', 'alt': '', 'radius': 0})
    return n


SHADOW_D = {'color': 'black', 'opacity': 0.9, 'x': 0, 'y': 0.12, 'blur': 0.45}
SHADOW_M = {'color': 'black', 'opacity': 0.9, 'x': 0, 'y': 0.3, 'blur': 1.1}


def text(id_, txt, x, y, w, h, size, color='onSurface', weight='800', align='center', effects=(), font='heading', shadow=None, **extra):
    n = base(id_, txt[:40], x, y, w, h, effects)
    n['shadow'] = shadow
    n.update({'type': 'text', 'text': txt, 'color': color, 'font': font, 'fontSize': r2(size), 'weight': weight, 'align': align}, **extra)
    return n


def button(id_, label, x, y, w, h, size, action, effects=(), **extra):
    n = base(id_, label, x, y, w, h, effects)
    n.update({'type': 'button', 'label': label, 'action': action, 'bg': 'primary', 'fg': 'onPrimary', 'font': 'heading',
              'fontSize': r2(size), 'weight': '800', 'radius': r2(h * 0.5)}, **extra)
    return n


def lottie(id_, x, y, w, aspect, effects=()):
    iw, ih = SIZES['equalizer']
    h = w * aspect / (iw / ih)
    n = base(id_, 'Equalizer (Lottie)', x, y, w, h, effects)
    n.update({'type': 'lottie', 'uri': CDN + 'equalizer.json', 'loop': True, 'speed': 1, 'alt': 'Неонов еквалайзер'})
    return n


def countdown(id_, x, y, w, h, size):
    n = base(id_, 'Countdown – start', x, y, w, h, [enter('fade', 900, 700)])
    # neon glow on the digits themselves (a 'glow' effect on a text-like layer lights its whole box)
    n['shadow'] = {'color': 'secondary', 'opacity': 0.85, 'x': 0, 'y': 0, 'blur': 2.4 if size > 5 else 1.1}
    n.update({'type': 'countdown', 'endDate': '2026-12-05', 'endTime': {'hour': 21, 'minute': 0}, 'timeZone': 'Europe/Sofia',
              'format': 'dhms', 'labels': {'days': 'д', 'hours': 'ч', 'minutes': 'м', 'seconds': 'с'},
              'endedText': 'ТУРНИРЪТ ЗАПОЧНА!', 'color': 'secondary', 'font': 'heading', 'fontSize': r2(size),
              'weight': '800', 'align': 'center'})
    return n


# ───────────── effect helpers ─────────────

def enter(preset, delay, dur=800):
    return {'type': 'enter', 'preset': preset, 'delayMs': delay, 'durationMs': dur}


def kf(at, opacity=1, x=0, y=0, scale=1, rotate=0, easing='linear'):
    return {'atMs': at, 'opacity': opacity, 'x': x, 'y': y, 'scale': scale, 'rotate': rotate, 'easing': easing}


def timeline(delay, frames, repeat='none'):
    return {'type': 'timeline', 'delayMs': delay, 'repeat': repeat, 'keyframes': frames}


def pop(delay):  # scale 0 → overshoot → settle
    return timeline(delay, [kf(0, 0, scale=0.2), kf(450, 1, scale=1.12, easing='back'), kf(800, 1, scale=1, easing='easeInOut')])


def drop_in(delay, height=12):  # falls from above and bounces
    return timeline(delay, [kf(0, 0, y=-height), kf(200, 1, y=-height * 0.8), kf(1000, 1, y=0, easing='bounce')])


def slide_in(delay, dx=-25):  # plates sweep in from the left with a little overshoot
    return timeline(delay, [kf(0, 0, x=dx), kf(650, 1, x=1.2, easing='easeOut'), kf(900, 1, x=0, easing='back')])


def glow(colors, blur, spread, dur):
    return {'type': 'glow', 'colors': colors, 'blur': blur, 'spread': spread, 'durationMs': dur}


def float_(distance, dur, delay=0):
    return {'type': 'float', 'distance': distance, 'durationMs': dur, 'delayMs': delay}


def pulse(scale, dur, delay=0):
    return {'type': 'pulse', 'scale': scale, 'durationMs': dur, 'delayMs': delay}


def hover(px_per_u, color='primary'):
    return {'scale': 1.06, 'lift': r2(8 / px_per_u), 'brightness': 1.2,
            'glow': {'color': color, 'blur': r2(22 / px_per_u), 'opacity': 0.9}, 'durationMs': 350}


LOGIN = {'type': 'navigate', 'route': 'Login'}


def scene(id_, name, aspect, nodes, background='background'):
    return {'version': 1, 'id': id_, 'name': name, 'aspectRatio': round(aspect, 6), 'background': background, 'nodes': nodes}


# ───────────── hero slider ─────────────

D_HERO = 1920 / 900
M_HERO = 750 / 1100
PX_D = 14.4  # px per u on a 1440-wide desktop
PX_M = 3.9   # px per u on a 390-wide phone


def backdrop(m):
    sfx = 'mob' if m else 'desk'
    return [
        full('sky', 'Sky', f'sky-{sfx}'),
        full('stars', 'Stars (parallax)', f'stars-{sfx}', [{'type': 'parallax', 'depth': 0.35}]),
        full('sun', 'Sun + grid (Ken Burns)', f'sun-{sfx}', [{'type': 'kenBurns', 'fromScale': 1, 'toScale': 1.08, 'fromX': 0, 'fromY': 0,
                                                             'toX': 0, 'toY': 2, 'durationMs': 16000, 'mode': 'pingpong'}]),
    ]


def cta(m, y):
    w, h = (56, 7.4) if m else (18, 8.6)
    return button('cta', 'ВКЛЮЧИ СЕ', 50 - w / 2, y, w, h, 4.6 if m else 1.9, LOGIN,
                  [enter('bounceIn', 1100, 900), pulse(1.05, 900, 1800)], hover=hover(PX_M if m else PX_D))


def slide1(m):
    a = M_HERO if m else D_HERO
    nodes = backdrop(m)
    if m:
        t, th = img('title', 'НЕОНОВА НОЩ (chrome)', 'title-mob', 4, 5, 92, a, alt='Неонова нощ')
        sub_y, lab_y, cd_y = 5 + th + 1, 69, 73
        nodes += [t,
                  text('subtitle', 'ТУРНИР ПО СЛОТОВЕ', 4, sub_y, 92, 6, 5.2, 'secondary', shadow=SHADOW_M,
                       effects=[{'type': 'splitText', 'by': 'char', 'preset': 'fadeUp', 'staggerMs': 40, 'delayMs': 500, 'durationMs': 500},
                                glow(['secondary'], 2, 0.2, 2000)]),
                  text('label', 'ЗАПОЧВА СЛЕД', 10, lab_y, 80, 4, 3.6, 'onSurface', '700', effects=[enter('fade', 800, 600)], shadow=SHADOW_M),
                  countdown('countdown', 2, cd_y, 96, 6.5, 6.6),
                  cta(m, 86)]
    else:
        t, th = img('title', 'НЕОНОВА НОЩ (chrome)', 'title-desk', 16, 3, 68, a, alt='Неонова нощ')
        nodes += [t,
                  text('subtitle', 'ТУРНИР ПО СЛОТОВЕ', 20, 3 + th, 60, 6, 2.2, 'secondary', shadow=SHADOW_D,
                       effects=[{'type': 'splitText', 'by': 'char', 'preset': 'fadeUp', 'staggerMs': 40, 'delayMs': 500, 'durationMs': 500},
                                glow(['secondary'], 1, 0.1, 2000)]),
                  text('label', 'ЗАПОЧВА СЛЕД', 30, 66, 40, 4.5, 1.3, 'onSurface', '700', effects=[enter('fade', 800, 600)], shadow=SHADOW_D),
                  countdown('countdown', 25, 70, 50, 9, 3.2),
                  cta(m, 84)]
    t['effects'] = [timeline(0, [kf(0, 0, scale=1.35), kf(700, 1, scale=0.97, easing='easeOut'), kf(1000, 1, scale=1, easing='back')])]
    return scene(f'nn_hero1_{"m" if m else "d"}', f'Слайд 1 – Неонова нощ ({"mobile" if m else "desktop"})', a, nodes)


def slide2(m):
    a = M_HERO if m else D_HERO
    nodes = backdrop(m)
    if m:
        heading = text('fund', 'НАГРАДЕН ФОНД', 4, 12, 92, 6, 6.4, 'secondary', effects=[enter('fadeDown', 200, 700), glow(['secondary'], 2, 0.2, 2000)])
        p, ph = img('prize', '50 000 € (chrome)', 'prize-50000', 3, 21, 94, a, alt='50 000 €')
        coins = [(3, 38, 16, 0), (81, 38, 16, 250), (42, 52, 16, 500)]
        sub = text('top', 'ЗА ТОП 50 ИГРАЧИ', 10, 71, 80, 5, 4.6, 'onSurface', '700', effects=[enter('fadeUp', 900, 700)], shadow=SHADOW_M)
    else:
        heading = text('fund', 'НАГРАДЕН ФОНД', 25, 8, 50, 8, 2.8, 'secondary', effects=[enter('fadeDown', 200, 700), glow(['secondary'], 1, 0.1, 2000)])
        p, ph = img('prize', '50 000 € (chrome)', 'prize-50000', 18, 19, 64, a, alt='50 000 €')
        coins = [(7, 20, 7, 0), (85, 12, 6, 250), (80, 50, 8, 500)]
        sub = text('top', 'ЗА ТОП 50 ИГРАЧИ', 30, 69, 40, 6, 1.6, 'onSurface', '700', effects=[enter('fadeUp', 900, 700)], shadow=SHADOW_D)
    p['effects'] = [pop(300), pulse(1.03, 2200, 1500)]
    nodes += [heading, p, sub]
    for i, (x, y, w, d) in enumerate(coins):
        c, _ = img(f'coin{i + 1}', f'Coin {i + 1}', 'coin', x, y, w, a, alt='')
        c['effects'] = [drop_in(600 + d, 14 if m else 6), float_(1.2 if m else 0.6, 1800 + i * 300, 1600 + i * 300)]
        nodes.append(c)
    nodes.append(cta(m, 86 if m else 84))
    return scene(f'nn_hero2_{"m" if m else "d"}', f'Слайд 2 – Награден фонд ({"mobile" if m else "desktop"})', a, nodes)


def slide3(m):
    a = M_HERO if m else D_HERO
    nodes = backdrop(m)
    if m:
        moon, _ = img('moon', 'Moon + clock', 'moon-clock', 22, 3, 56, a, alt='Луна и неонов часовник')
        sign, sh = img('sign', 'ВСЯКА НОЩ 21:00 – 02:00', 'sign-hours', 4, 42, 92, a, alt='Всяка нощ 21:00 – 02:00')
        dates = text('dates', '05.12 – 14.12.2026', 4, 42 + sh + 2, 92, 5, 5.2, 'gold', shadow=SHADOW_M)
        eq = lottie('eq', 38, 72, 24, a)
    else:
        moon, _ = img('moon', 'Moon + clock', 'moon-clock', 7, 6, 30, a, alt='Луна и неонов часовник')
        sign, sh = img('sign', 'ВСЯКА НОЩ 21:00 – 02:00', 'sign-hours', 41, 10, 52, a, alt='Всяка нощ 21:00 – 02:00')
        dates = text('dates', '05.12 – 14.12.2026', 25, 67, 50, 6, 2.2, 'gold', shadow=SHADOW_D)
        eq = lottie('eq', 80, 74, 12, a)
    moon['effects'] = [enter('zoomIn', 100, 900), float_(1.2 if m else 0.7, 3200, 1000)]
    sign['effects'] = [enter('flipIn', 300, 900), glow(['primary', 'secondary'], 1.5, 0.2, 1500)]
    dates['effects'] = [enter('fadeUp', 700, 700)]
    eq['effects'] = [enter('fade', 900, 600)]
    nodes += [moon, sign, dates, eq, cta(m, 86 if m else 84)]
    return scene(f'nn_hero3_{"m" if m else "d"}', f'Слайд 3 – Всяка нощ ({"mobile" if m else "desktop"})', a, nodes)


# ───────────── how to play ─────────────

STEPS = [('cabinet-1', 'Регистрирай се', 'primary'), ('cabinet-2', 'Играй избраните слотове', 'secondary'),
         ('cabinet-3', 'Трупай точки и печели', 'accent')]


def howto(m):
    a = 750 / 1700 if m else 1920 / 1000
    nodes = [full('bg', 'Panel background', 'panel-mob' if m else 'panel-desk')]
    if m:
        nodes += [text('title', 'КАК СЕ ИГРАЕ', 4, 2.5, 92, 4.5, 8.4, 'primary',
                       effects=[{'type': 'splitText', 'by': 'word', 'preset': 'fadeDown', 'staggerMs': 150, 'delayMs': 0, 'durationMs': 600},
                                glow(['primary'], 2, 0.2, 2000)]),
                  lottie('eq', 40, 7.6, 20, a)]
        for i, (file, caption, color) in enumerate(STEPS):
            left = i % 2 == 0
            y = 12 + i * 29
            cab, ch = img(f'cab{i + 1}', f'Cabinet {i + 1}', file, 8 if left else 58, y, 34, a, alt=f'Стъпка {i + 1}: {caption}')
            cab['effects'] = [enter('slideRight' if left else 'slideLeft', i * 200, 800), float_(1, 2600 + i * 300, 1200 + i * 250)]
            cab['hover'] = hover(PX_M, color)
            nodes += [cab, text(f'cap{i + 1}', caption, 44 if left else 4, y + ch * 0.38, 52, 8, 4.6, 'onSurface', '800',
                                'left' if left else 'right', effects=[enter('fadeUp', 300 + i * 200, 700)])]
    else:
        nodes += [text('title', 'КАК СЕ ИГРАЕ', 20, 5, 60, 9, 3.6, 'primary',
                       effects=[{'type': 'splitText', 'by': 'word', 'preset': 'fadeDown', 'staggerMs': 150, 'delayMs': 0, 'durationMs': 600},
                                glow(['primary'], 1, 0.1, 2000)]),
                  lottie('eq', 75, 5.5, 8, a)]
        for i, (file, caption, color) in enumerate(STEPS):
            x = 14 + i * 27.5
            cab, ch = img(f'cab{i + 1}', f'Cabinet {i + 1}', file, x, 18, 17, a, alt=f'Стъпка {i + 1}: {caption}')
            cab['effects'] = [enter('fadeUp', i * 200, 800), float_(0.6, 2600 + i * 300, 1200 + i * 250)]
            cab['hover'] = hover(PX_D, color)
            nodes += [cab, text(f'cap{i + 1}', caption, x - 4, 18 + ch + 2, 25, 8, 1.6, 'onSurface', '800',
                                effects=[enter('fadeUp', 300 + i * 200, 700)])]
    return scene(f'nn_howto_{"m" if m else "d"}', f'Как се играе ({"mobile" if m else "desktop"})', a, nodes)


# ───────────── prizes ─────────────

PRIZES = [('plate-1', '10 000 €', 'gold'), ('plate-2', '5 000 €', 'secondary'), ('plate-3', '2 500 €', 'primary'),
          ('plate-4', '1 000 €', 'accent'), ('plate-5', '200 €', 'accent')]


def prizes(m):
    a = 750 / 900 if m else 1920 / 1100
    nodes = [full('bg', 'Panel background', 'panel-mob' if m else 'panel-desk')]
    title = text('title', 'НАГРАДИ', 4 if m else 30, 2.5 if m else 4, 92 if m else 40, 7 if m else 9, 8.4 if m else 3.6, 'gold',
                 effects=[enter('zoomIn', 0, 700), glow(['gold'], 2 if m else 1, 0.2, 2000)])
    nodes.append(title)
    pw, px = (94, 3) if m else (52, 24)
    y = 12 if m else 18
    step = 12.6 if m else 14.6
    for i, (file, amount, color) in enumerate(PRIZES):
        plate, ph = img(f'plate{i + 1}', f'Prize plate {i + 1}', file, px, y + i * step, pw, a, alt='')
        plate['effects'] = [slide_in(i * 180)]
        amt_x = px + pw * (0.43 if m else 0.42)
        nodes += [plate, text(f'amount{i + 1}', amount, amt_x, y + i * step + ph * 0.2, pw * 0.4, ph * 0.6, 5.4 if m else 2.4, color,
                              effects=[slide_in(i * 180 + 150), glow([color], 1.5 if m else 0.8, 0.1, 2200)])]
    foot_y = y + 4 * step + (12 if m else 14)
    nodes.append(text('points', '1 точка за всеки 1 € залог на турнирните слотове', 6 if m else 20, foot_y, 88 if m else 60,
                      9 if m else 5, 3.8 if m else 1.3, 'onSurface', '700', effects=[enter('fade', 1100, 700)]))
    return scene(f'nn_prizes_{"m" if m else "d"}', f'Награди ({"mobile" if m else "desktop"})', a, nodes)


# ───────────── mystery box ─────────────

def mystery(m):
    a = 750 / 1000 if m else 1920 / 900
    nodes = [full('bg', 'Panel background', 'panel-mob' if m else 'panel-desk')]
    if m:
        nodes.append(text('title', 'МИСТЕРИОЗНА КУТИЯ', 4, 3, 92, 6, 6.6, 'primary', effects=[enter('fadeDown', 0, 700), glow(['primary'], 2, 0.2, 2000)]))
        burst, _ = img('burst', 'Burst (revealed)', 'burst', 5, 13, 90, a, alt='')
        box, bh = img('box', 'Mystery box (tap)', 'giftbox', 20, 18, 60, a, alt='Мистериозна кутия – докосни')
        hint = text('hint', 'ДОКОСНИ КУТИЯТА', 4, 18 + bh + 2, 92, 6, 5.6, 'secondary')
        prize_txt = text('prize', '+50 FREE SPINS', 2, 40, 96, 10, 7, 'gold', shadow=SHADOW_M)
    else:
        nodes.append(text('title', 'МИСТЕРИОЗНА КУТИЯ', 20, 5, 60, 9, 3.2, 'primary', effects=[enter('fadeDown', 0, 700), glow(['primary'], 1, 0.1, 2000)]))
        burst, _ = img('burst', 'Burst (revealed)', 'burst', 32, 14, 36, a, alt='')
        box, bh = img('box', 'Mystery box (tap)', 'giftbox', 39, 18, 22, a, alt='Мистериозна кутия – докосни')
        hint = text('hint', 'ДОКОСНИ КУТИЯТА', 30, 18 + bh + 2, 40, 7, 1.8, 'secondary')
        prize_txt = text('prize', '+50 FREE SPINS', 20, 42, 60, 14, 4.6, 'gold', shadow=SHADOW_D)
    burst.update({'startHidden': True, 'effects': [pop(0), {'type': 'spin', 'direction': 'cw', 'durationMs': 20000}]})
    prize_txt.update({'startHidden': True, 'effects': [pop(200), glow(['gold', 'primary'], 2, 0.3, 1200)]})
    box['effects'] = [enter('bounceIn', 200, 900), glow(['primary', 'secondary'], 2.5, 0.4, 1400), float_(1 if m else 0.5, 2400, 1200)]
    box['hover'] = hover(PX_M if m else PX_D, 'primary')
    box['triggers'] = [{'do': 'hide', 'target': 'box'}, {'do': 'hide', 'target': 'hint'}, {'do': 'show', 'target': 'burst'},
                       {'do': 'play', 'target': 'burst'}, {'do': 'show', 'target': 'prize'}, {'do': 'play', 'target': 'prize'}]
    hint['effects'] = [enter('fade', 900, 600), pulse(1.06, 900, 1500)]
    nodes += [burst, box, hint, prize_txt]
    return scene(f'nn_mystery_{"m" if m else "d"}', f'Мистериозна кутия ({"mobile" if m else "desktop"})', a, nodes)


# ───────────── widgets ─────────────

GAMES = [('neon-cherry', 'Neon Cherry'), ('synth-7s', 'Synth 7s'), ('midnight-drive', 'Midnight Drive'),
         ('laser-fruits', 'Laser Fruits'), ('retro-spin', 'Retro Spin'), ('pixel-jackpot', 'Pixel Jackpot')]

carousel = {'type': 'gameCarousel', 'title': 'ТУРНИРНИ СЛОТОВЕ', 'backgroundUri': CDN + 'carousel-bg.webp', 'background': 'background',
            'games': [{'id': gid, 'name': name, 'imageUri': CDN + f'slot-{gid}.webp', 'action': {'type': 'openGame', 'gameId': gid}}
                      for gid, name in GAMES],
            'playLabel': 'ИГРАЙ', 'ctaText': 'ОЩЕ ИГРИ В КАЗИНОТО', 'ctaLabel': 'КЪМ КАЗИНОТО',
            'ctaAction': {'type': 'navigate', 'route': 'Casino', 'webPath': '/casino'},
            'colors': {'text': 'white', 'accent': 'primary', 'onAccent': 'onPrimary'}, 'font': 'heading'}


def s(t, bold=False):
    return {'text': t, 'bold': bold}


TERMS = [
    [s('Турнирът „'), s('НЕОНОВА НОЩ', True), s('“ се провежда от 05.12.2026 г. до 14.12.2026 г., всяка вечер от 21:00 ч. до 02:00 ч. българско време.')],
    [s('Участват само регистрирани и верифицирани потребители, навършили '), s('18 години', True), s('.')],
    [s('За всеки 1 € залог на турнирните слотове участникът получава 1 точка. Залози с бонус средства не носят точки.')],
    [s('Класирането се определя по общия брой точки. При равенство по-напред е участникът, достигнал резултата по-рано.')],
    [s('Наградният фонд от '), s('50 000 €', True), s(' се разпределя между първите 50 участници в класирането.')],
    [s('Наградите се начисляват до 72 часа след края на турнира.')],
    [s('Безплатните завъртания от мистериозната кутия са валидни 24 часа и подлежат на превъртане '), s('x30', True), s('.')],
    [s('Всеки участник може да отвори мистериозната кутия веднъж на ден.')],
    [s('Организаторът си запазва правото да променя или прекратява турнира при нарушение на правилата.')],
]

terms = {'type': 'terms', 'title': 'ПРАВИЛА И УСЛОВИЯ:', 'expandLabel': 'ПОКАЖИ ВСИЧКИ ПРАВИЛА', 'collapseLabel': 'СКРИЙ ПРАВИЛАТА',
         'previewBlocks': 3,
         'blocks': [{'kind': 'numbered', 'spans': sp} for sp in TERMS] +
                   [{'kind': 'paragraph', 'spans': [s('18+ | Играй отговорно. Хазартът може да доведе до пристрастяване.', True)]}],
         'colors': {'background': 'background', 'card': 'surface', 'text': 'onSurface', 'accent': 'primary'}}


def page():
    slides = [{'id': f'slide{i}', 'scene': f(False), 'mobileScene': f(True)} for i, f in ((1, slide1), (2, slide2), (3, slide3))]
    return {'version': 1, 'id': 'neon-night', 'name': 'Неонова нощ – турнир по слотове', 'background': 'background',
            'mobileBreakpoint': 600, 'maxWidth': 1920,
            'sections': [
                {'kind': 'slider', 'id': 'hero', 'slides': slides, 'transition': 'zoom', 'transitionMs': 900, 'autoplayMs': 7000,
                 'loop': True, 'showDots': True, 'showArrows': True, 'pauseOnInteraction': True,
                 'dotColor': 'onSurface', 'activeDotColor': 'primary'},
                {'kind': 'scene', 'id': 'howto', 'scene': howto(False), 'mobileScene': howto(True)},
                {'kind': 'scene', 'id': 'prizes', 'scene': prizes(False), 'mobileScene': prizes(True)},
                {'kind': 'scene', 'id': 'mystery', 'scene': mystery(False), 'mobileScene': mystery(True)},
                {'kind': 'widget', 'id': 'games', 'widget': carousel},
                {'kind': 'widget', 'id': 'terms', 'widget': terms},
            ]}


def check_bounds(p):
    """Every node must stay inside its scene (small tolerance for glow)."""
    problems = []
    def walk(sc):
        for n in sc['nodes']:
            f = n['frame']
            if f['y'] + f['h'] > 101 or f['x'] + f['w'] > 101 or f['x'] < -1 or f['y'] < -1:
                problems.append(f"{sc['id']}:{n['id']} frame {f}")
    for sec in p['sections']:
        if sec['kind'] == 'scene':
            walk(sec['scene']); walk(sec['mobileScene'])
        elif sec['kind'] == 'slider':
            for sl in sec['slides']:
                walk(sl['scene']); walk(sl['mobileScene'])
    if problems:
        raise SystemExit('layout overflow:\n' + '\n'.join(problems))


if __name__ == '__main__':
    p = page()
    check_bounds(p)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
    print('wrote', os.path.relpath(OUT, HERE))
