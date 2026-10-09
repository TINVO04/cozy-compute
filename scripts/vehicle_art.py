"""Native 48x40 vehicle artwork. Integer clusters, no resampling or antialiasing.

The named model silhouettes are authored independently. Shared routines only draw
materials/mechanical parts. Left/right views expose different drivetrain parts.
All frames use the same contact plane; only sprung components move by one pixel.
"""
import math
from PIL import Image, ImageDraw

INK = '#17212d'
RUBBER = '#202734'
STEEL = '#8596a5'
CHROME = '#d8e6e9'
WHITE = '#f8f3dc'
GLASS = '#243e54'
REFLECT = '#719fae'
RED = '#a12942'
GOLD = '#dca74b'


def tone(color, factor):
    rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
    if factor > 1:
        rgb = tuple(round(c + (255-c)*(factor-1)) for c in rgb)
    else:
        rgb = tuple(round(c*factor) for c in rgb)
    return tuple(max(0, min(255, c)) for c in rgb) + (255,)


class Pixel:
    def __init__(self, image, dy=0):
        self.im = image
        self.d = ImageDraw.Draw(image)
        self.dy = dy

    def poly(self, points, fill, outline=None):
        self.d.polygon([(x, y+self.dy) for x, y in points], fill, outline)

    def line(self, points, fill, width=1):
        self.d.line([(x, y+self.dy) for x, y in points], fill, width)

    def rect(self, x, y, w, h, fill):
        self.d.rectangle((x, y+self.dy, x+w-1, y+self.dy+h-1), fill)

    def dot(self, x, y, fill):
        self.d.point((x, y+self.dy), fill)

    def ellipse(self, x, y, w, h, fill, outline=None):
        self.d.ellipse((x, y+self.dy, x+w-1, y+self.dy+h-1), fill, outline)

    def glass(self, points):
        self.poly(points, GLASS, INK)
        # Restrict reflections to the actual glass silhouette.
        mask = Image.new('1', (48, 40))
        ImageDraw.Draw(mask).polygon([(x, y+self.dy) for x, y in points], 1)
        x0, y0, x1, y1 = mask.getbbox()
        for y in range(y0+1, y1-1):
            for x in range(x0+1, x1-1):
                if mask.getpixel((x, y)) and y < y0+3:
                    self.im.putpixel((x, y), (72, 110, 132, 255))
                if mask.getpixel((x, y)) and x+y in (x0+y1-1, x0+y1):
                    self.im.putpixel((x, y), (150, 191, 199, 255))

    def lamp(self, x, y, rear=False, w=4):
        self.rect(x, y, w, 3, INK)
        self.rect(x, y+1, w-1, 2, RED if rear else STEEL)
        self.rect(x+1, y+1, max(1, w-2), 1, '#f9736d' if rear else WHITE)


def wheel(p, x, frame, style='alloy', radius=5):
    y = 37-radius
    p.ellipse(x-radius, y-radius, radius*2+1, radius*2+1, INK)
    p.ellipse(x-radius+1, y-radius+1, radius*2-1, radius*2-1, RUBBER)
    p.line([(x-radius+2, y-radius+1), (x+radius-2, y-radius+1)], '#4a5363')
    p.ellipse(x-radius+2, y-radius+2, radius*2-3, radius*2-3, STEEL)
    p.ellipse(x-radius+3, y-radius+3, radius*2-5, radius*2-5, INK)
    if style == 'disc':
        p.ellipse(x-radius+2, y-radius+2, radius*2-3, radius*2-3, CHROME)
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            p.dot(x+dx, y+dy, STEEL)
    else:
        count = 8 if style == 'wire' else 5
        for n in range(count):
            angle = (n/count + frame/16)*math.tau
            dx, dy = round(math.cos(angle)*(radius-2)), round(math.sin(angle)*(radius-2))
            p.line([(x, y), (x+dx, y+dy)], CHROME if n % 2 else STEEL)
        if style != 'wire':
            p.dot(x+radius-2, y+1, GOLD)
    p.dot(x, y, CHROME)
    # Moving tire shoulder, without moving the axle or ground contact.
    p.dot(x+(-2, 0, 2, 1)[frame], 36, '#46505d')


CAR_OUTLINES = {
    'ferrari-f40': [(4, 23), (5, 19), (14, 18), (19, 13), (27, 13), (33, 20), (40, 22), (43, 26), (42, 30), (5, 30)],
    'lamborghini-aventador': [(4, 25), (7, 21), (14, 20), (22, 14), (29, 15), (34, 21), (43, 26), (42, 30), (5, 30)],
    'porsche-911': [(5, 24), (7, 21), (12, 19), (16, 14), (21, 11), (26, 12), (31, 19), (37, 21), (41, 24), (42, 28), (40, 31), (6, 31)],
    'toyota-supra-mk4': [(4, 25), (6, 21), (14, 20), (19, 14), (25, 13), (29, 15), (33, 21), (39, 22), (43, 25), (42, 30), (6, 31)],
    'mercedes-benz-g63': [(5, 30), (5, 15), (9, 15), (9, 7), (12, 5), (30, 5), (33, 8), (33, 17), (40, 17), (42, 20), (42, 31)],
    'rolls-royce-phantom': [(4, 24), (5, 19), (10, 19), (12, 10), (15, 8), (27, 8), (31, 17), (41, 17), (43, 20), (43, 30), (5, 31)],
    'ford-mustang': [(4, 23), (7, 20), (13, 20), (19, 13), (26, 13), (32, 20), (41, 21), (43, 24), (42, 31), (5, 31)],
    'tesla-model-s': [(4, 26), (8, 22), (14, 18), (19, 13), (25, 12), (29, 14), (34, 21), (41, 23), (43, 26), (41, 30), (6, 31)],
}


def car_side(spec, direction, frame):
    im = Image.new('RGBA', (48, 40))
    ground = Pixel(im)
    ground.ellipse(5, 34, 38, 5, (12, 20, 29, 65))
    p = Pixel(im, (0, 1, 0, -1)[frame])
    model = spec['model']
    base = spec['colors']['primary']
    dark, light, shine = tone(base, .55), tone(base, 1.3), tone(base, 1.6)
    p.poly(CAR_OUTLINES[model], base, INK)
    p.line([(6, 29), (41, 29)], dark, 2)
    p.line([(17, 30), (28, 30)], STEEL)
    # Every greenhouse follows its own roof line and pillar angles.
    windows = {
        'ferrari-f40': [(17, 19), (20, 14), (26, 14), (31, 20)],
        'lamborghini-aventador': [(17, 20), (23, 15), (28, 16), (32, 21)],
        'porsche-911': [(13, 20), (18, 14), (22, 12), (26, 14), (29, 20)],
        'toyota-supra-mk4': [(15, 21), (20, 15), (25, 14), (29, 17), (31, 21)],
        'mercedes-benz-g63': [(11, 8), (29, 8), (31, 11), (31, 17), (11, 17)],
        'rolls-royce-phantom': [(12, 18), (14, 10), (26, 10), (29, 18)],
        'ford-mustang': [(15, 20), (20, 14), (25, 14), (30, 20)],
        'tesla-model-s': [(12, 22), (20, 14), (25, 13), (29, 16), (32, 22)],
    }
    p.glass(windows[model])
    p.line([(23, 15), (23, 21)], INK)
    p.line([(19, 23), (18, 28), (27, 28), (29, 23)], dark)
    p.rect(25, 23, 3, 1, CHROME if model == 'rolls-royce-phantom' else light)
    p.line([(7, 23), (15, 22)], light)
    p.line([(31, 23), (39, 24)], shine)
    p.rect(30, 20, 3, 2, dark)
    p.dot(31, 20, shine)
    p.lamp(39, 25, w=4)
    p.lamp(5, 24, True, 3)
    if model == 'ferrari-f40':
        p.rect(5, 12, 2, 9, base)
        p.rect(5, 11, 11, 2, base)
        p.line([(5, 11), (15, 11)], shine)
        p.poly([(16, 25), (20, 22), (22, 22), (21, 26)], INK)
        for x in (9, 11, 13):
            p.line([(x, 17), (x+1, 19)], STEEL)
        p.line([(6, 27), (40, 27)], dark)
    elif model == 'lamborghini-aventador':
        p.line([(7, 20), (8, 14), (13, 14)], INK)
        p.rect(4, 13, 12, 2, INK)
        p.line([(5, 13), (14, 13)], STEEL)
        p.poly([(15, 23), (21, 22), (19, 28), (14, 28)], INK)
        p.line([(21, 23), (28, 25), (23, 28)], light)
        p.line([(32, 23), (41, 27)], light)
    elif model == 'porsche-911':
        p.line([(8, 20), (8, 9), (11, 9), (11, 11)], STEEL)
        p.rect(4, 8, 11, 2, INK)
        p.line([(5, 8), (13, 8)], CHROME)
        for x in (32, 34, 36):
            p.line([(x, 22), (x+1, 23)], INK)
        p.ellipse(38, 23, 3, 3, WHITE, STEEL)
    elif model == 'toyota-supra-mk4':
        p.line([(6, 21), (6, 15), (8, 13), (12, 13), (14, 15)], light, 2)
        p.line([(15, 25), (17, 26), (27, 26)], light)
        if direction == 1:
            p.rect(5, 29, 3, 2, CHROME)
    elif model == 'mercedes-benz-g63':
        p.line([(10, 6), (29, 6)], shine)
        for x in (18, 25):
            p.line([(x, 8), (x, 28)], dark)
            p.dot(x+2, 20, CHROME)
        p.rect(4, 15, 3, 11, INK)
        p.rect(4, 17, 2, 7, STEEL)
        p.rect(37, 16, 3, 2, GOLD)
        p.rect(19, 30, 6, 2, CHROME)
        p.rect(21, 31, 1, 1, INK)
        p.ellipse(39, 21, 3, 4, WHITE, STEEL)
    elif model == 'rolls-royce-phantom':
        p.line([(30, 18), (40, 18)], CHROME, 2)
        p.line([(10, 19), (29, 19)], CHROME)
        p.line([(22, 19), (22, 29)], dark)
        p.rect(20, 22, 5, 1, CHROME)
        p.rect(41, 20, 2, 9, CHROME)
        p.dot(40, 16, WHITE)
        p.line([(7, 28), (39, 28)], STEEL)
    elif model == 'ford-mustang':
        p.poly([(32, 19), (36, 18), (38, 20)], INK)
        p.rect(5, 19, 8, 2, INK)
        p.rect(36, 21, 3, 1, WHITE)
        p.line([(18, 27), (28, 27)], WHITE)
        p.rect(39, 25, 3, 4, INK)
        p.line([(39, 25), (41, 25)], WHITE)
    else:  # Plaid: continuous glass fastback, flush handles, restrained chrome.
        p.line([(14, 17), (20, 12), (25, 12), (29, 14)], GLASS)
        p.rect(14, 24, 3, 1, CHROME)
        p.rect(26, 24, 3, 1, CHROME)
        p.line([(39, 24), (42, 26)], WHITE)
        if direction == 1:
            p.rect(8, 22, 2, 2, INK)  # charge port is on vehicle-left rear
    # Wheel cavities follow round arches; wheel positions never bounce.
    for x in (11, 35):
        ground.ellipse(x-6, 25, 13, 12, dark)
        wheel(ground, x, frame, 'disc' if model == 'rolls-royce-phantom' else 'alloy')
    if direction == 1:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im


CAR_TOP = {
    'ferrari-f40': [(13, 5), (34, 5), (37, 9), (37, 29), (35, 35), (12, 35), (10, 29), (10, 10)],
    'lamborghini-aventador': [(16, 5), (31, 5), (37, 13), (38, 29), (32, 36), (15, 36), (9, 29), (10, 13)],
    'porsche-911': [(18, 4), (29, 4), (33, 7), (37, 18), (37, 30), (33, 36), (14, 36), (10, 30), (10, 18), (14, 7)],
    'toyota-supra-mk4': [(17, 5), (30, 5), (35, 10), (37, 19), (38, 29), (35, 35), (12, 35), (9, 29), (10, 19), (12, 10)],
    'mercedes-benz-g63': [(12, 4), (35, 4), (37, 6), (37, 34), (35, 37), (12, 37), (10, 34), (10, 6)],
    'rolls-royce-phantom': [(15, 3), (32, 3), (36, 7), (36, 32), (34, 37), (13, 37), (11, 32), (11, 7)],
    'ford-mustang': [(16, 5), (31, 5), (36, 11), (36, 21), (38, 25), (36, 36), (11, 36), (9, 25), (11, 21), (11, 11)],
    'tesla-model-s': [(18, 4), (29, 4), (34, 8), (37, 19), (36, 31), (33, 36), (14, 36), (11, 31), (10, 19), (13, 8)],
}


def car_vertical(spec, direction, frame):
    im = Image.new('RGBA', (48, 40))
    p = Pixel(im)
    model, base = spec['model'], spec['colors']['primary']
    dark, light, shine = tone(base, .55), tone(base, 1.25), tone(base, 1.55)
    rear = direction == 3
    p.ellipse(9, 34, 30, 5, (12, 20, 29, 65))
    for x in (9, 35):
        p.rect(x, 24, 4, 14, INK)
        p.line([(x+1, 27), (x+1, 35)], '#46505d')
        p.dot(x+1, 27+frame*2, STEEL)
    p.poly(CAR_TOP[model], base, INK)
    p.line([(13, 24), (12, 31), (15, 34), (32, 34), (35, 31), (34, 24)], dark, 2)
    p.line([(14, 12), (14, 24)], light)
    p.line([(33, 12), (33, 24)], dark)
    roof = 5 if model == 'mercedes-benz-g63' else 7
    p.poly([(18, roof), (29, roof), (32, 13), (15, 13)], light)
    p.glass([(16, 13 if not rear else 8), (31, 13 if not rear else 8),
             (33, 21 if not rear else 16), (14, 21 if not rear else 16)])
    p.line([(16, 22), (31, 22)], shine)
    p.rect(8, 20, 4, 2, dark)
    p.rect(36, 20, 4, 2, light)
    p.line([(15, 24), (16, 27)], light)
    p.line([(32, 24), (31, 27)], dark)
    if rear:
        p.lamp(12, 29, True, 6)
        p.lamp(30, 29, True, 6)
        p.rect(19, 32, 10, 3, INK)
        p.rect(21, 32, 6, 2, STEEL)
        if model == 'ferrari-f40':
            for y in (18, 20, 22):
                p.rect(17, y, 14, 1, INK)
                p.rect(18, y, 12, 1, STEEL)
            p.rect(11, 25, 2, 5, base)
            p.rect(34, 25, 2, 5, base)
            p.rect(10, 24, 27, 2, light)
            p.rect(11, 24, 25, 1, shine)
            for x in (20, 23, 26):
                p.rect(x, 34, 2, 2, CHROME)
                p.dot(x, 35, INK)
        elif model == 'lamborghini-aventador':
            for x in (18, 28):
                p.line([(x, 20), (x, 26)], STEEL)
            p.poly([(9, 22), (38, 22), (36, 25), (11, 25)], INK)
            p.line([(11, 22), (36, 22)], STEEL)
            p.poly([(19, 33), (28, 33), (26, 36), (21, 36)], INK)
            p.line([(13, 29), (15, 30), (17, 29)], '#ff9c8a')
            p.line([(30, 29), (32, 30), (34, 29)], '#ff9c8a')
        elif model == 'porsche-911':
            for x in (17, 29):
                p.line([(x, 26), (x, 19), (x+2, 19), (x+2, 21)], STEEL)
            p.rect(9, 18, 30, 3, INK)
            p.line([(10, 18), (37, 18)], CHROME)
            p.line([(13, 30), (34, 30)], '#fa7378')
            p.rect(21, 35, 2, 2, STEEL)
            p.rect(25, 35, 2, 2, STEEL)
        elif model == 'toyota-supra-mk4':
            p.line([(11, 28), (11, 24), (14, 22), (33, 22), (36, 24), (36, 28)], light, 2)
            for x in (12, 16, 28, 32):
                p.ellipse(x, 29, 4, 4, INK)
                p.ellipse(x+1, 30, 2, 2, '#f67b78')
            p.rect(32, 34, 3, 2, CHROME)
        elif model == 'mercedes-benz-g63':
            p.ellipse(17, 20, 14, 14, INK)
            p.ellipse(19, 22, 10, 10, CHROME)
            p.ellipse(20, 23, 8, 8, dark)
            p.line([(24, 24), (24, 27), (21, 29), (24, 27), (27, 29)], CHROME)
        elif model == 'rolls-royce-phantom':
            p.line([(14, 26), (33, 26)], CHROME)
            p.rect(12, 28, 3, 6, RED)
            p.rect(33, 28, 3, 6, RED)
            p.rect(13, 28, 1, 3, '#fa958c')
            p.rect(34, 28, 1, 3, '#fa958c')
            p.line([(15, 35), (32, 35)], CHROME)
        elif model == 'ford-mustang':
            for x in (12, 15, 18, 28, 31, 34):
                p.rect(x, 29, 2, 4, RED)
                p.rect(x, 29, 1, 3, '#ff9180')
            p.rect(11, 25, 26, 2, INK)
        else:
            p.line([(14, 28), (19, 29), (28, 29), (33, 28)], '#f77a87')
            p.line([(15, 25), (32, 25)], dark)
    else:
        p.rect(18, 30, 12, 4, INK)
        p.line([(19, 33), (28, 33)], STEEL)
        p.lamp(12, 28, w=6)
        p.lamp(30, 28, w=6)
        if model == 'ferrari-f40':
            p.rect(10, 7, 28, 2, light)  # box wing visible beyond roof
            p.rect(15, 24, 4, 3, dark)
            p.rect(29, 24, 4, 3, dark)
            p.poly([(20, 26), (21, 23), (22, 26)], INK)
            p.poly([(25, 26), (26, 23), (27, 26)], INK)
        elif model == 'lamborghini-aventador':
            p.poly([(13, 32), (18, 31), (16, 34)], INK)
            p.poly([(34, 32), (29, 31), (31, 34)], INK)
            for x in (14, 31):
                p.line([(x, 27), (x+1, 29), (x+2, 27)], WHITE)
            p.line([(18, 23), (22, 27)], shine)
            p.line([(29, 23), (25, 27)], dark)
        elif model == 'porsche-911':
            p.ellipse(12, 25, 6, 6, STEEL, INK)
            p.ellipse(30, 25, 6, 6, STEEL, INK)
            p.ellipse(13, 26, 3, 3, WHITE)
            p.ellipse(31, 26, 3, 3, WHITE)
            for x in (12, 34):
                p.line([(x, 21), (x+1, 23)], INK)
            p.rect(9, 5, 30, 2, INK)
        elif model == 'toyota-supra-mk4':
            p.rect(19, 31, 10, 3, STEEL)
            p.line([(20, 32), (27, 32)], INK)
            p.line([(17, 24), (18, 27)], shine)
        elif model == 'mercedes-benz-g63':
            p.rect(18, 27, 12, 6, INK)
            for x in (19, 22, 25, 28):
                p.rect(x, 28, 1, 4, CHROME)
            p.ellipse(12, 27, 5, 5, CHROME, INK)
            p.ellipse(31, 27, 5, 5, CHROME, INK)
            p.dot(14, 29, WHITE)
            p.dot(33, 29, WHITE)
            p.rect(11, 23, 3, 2, GOLD)
            p.rect(34, 23, 3, 2, GOLD)
        elif model == 'rolls-royce-phantom':
            p.rect(18, 26, 12, 9, CHROME)
            for x in range(19, 29, 2):
                p.rect(x, 27, 1, 7, INK)
            p.line([(23, 23), (24, 24), (24, 26)], WHITE)
            p.line([(16, 23), (16, 26)], CHROME)
            p.line([(31, 23), (31, 26)], CHROME)
        elif model == 'ford-mustang':
            for x in (21, 25):
                p.rect(x, 7, 2, 6, WHITE)
                p.rect(x, 22, 2, 7, WHITE)
            p.poly([(19, 25), (21, 23), (27, 23), (29, 25)], INK)
            p.rect(12, 32, 5, 2, INK)
            p.rect(31, 32, 5, 2, INK)
        else:
            p.glass([(18, 6), (29, 6), (32, 12), (15, 12)])
            p.line([(20, 28), (27, 28)], dark)
            p.dot(24, 27, CHROME)
    return im


def motorcycle_side(spec, direction, frame):
    im = Image.new('RGBA', (48, 40))
    q = Pixel(im)
    q.ellipse(5, 35, 38, 4, (12, 20, 29, 65))
    model, base = spec['model'], spec['colors']['primary']
    dark, light, shine = tone(base, .55), tone(base, 1.3), tone(base, 1.6)
    wire = model in ('trek-marlin-7', 'honda-super-cub', 'bmw-r1250-gs')
    for x in (10, 36):
        wheel(q, x, frame, 'wire' if wire else 'disc' if model == 'harley-davidson-fat-boy' else 'alloy', 6)
    p = Pixel(im, (0, 1, 0, -1)[frame])
    # Wheel-side differences are drawn BEFORE orienting the body. Vehicle left
    # has chain/final drive; right has exhaust and the unobstructed Ducati hub.
    p.line([(10, 31), (23, 28)], STEEL, 2)
    p.line([(36, 31), (31, 17)], GOLD if model == 'ducati-panigale-v4' else STEEL, 2)
    if model == 'trek-marlin-7':
        p.line([(10, 31), (22, 18), (25, 30), (10, 31)], dark, 2)
        p.line([(22, 18), (31, 16), (25, 30), (22, 18)], base, 2)
        p.line([(23, 18), (30, 17)], light)
        p.line([(31, 16), (32, 21)], GOLD)
        if direction == 2:  # right-hand chainset
            p.ellipse(22, 27, 6, 6, STEEL, INK)
            p.line([(10, 30), (24, 28), (26, 32), (10, 32)], STEEL)
            p.rect(9, 33, 3, 2, INK)
        dx, dy = ((3, 0), (0, 3), (-3, 0), (0, -3))[frame]
        p.line([(25, 30), (25+dx, 30+dy)], CHROME)
        p.rect(24+dx, 30+dy, 3, 1, INK)
        p.line([(30, 16), (30, 12), (34, 12)], INK)
        p.rect(20, 17, 8, 2, INK)
        p.line([(21, 17), (25, 17)], STEEL)
        p.dot(29, 22, CHROME)  # bottle cage boss
    else:
        p.poly([(18, 24), (26, 23), (29, 28), (26, 32), (19, 31)], INK)
        for y in (26, 28, 30):
            p.line([(19, y), (26, y)], STEEL)
        if model == 'vespa-primavera-150':
            p.poly([(6, 25), (8, 21), (13, 20), (19, 23), (20, 28), (17, 31), (7, 30)], base, dark)
            p.line([(8, 24), (11, 22), (15, 22)], shine)
            p.poly([(28, 14), (32, 14), (34, 23), (31, 29), (21, 29), (21, 27), (28, 26)], base, dark)
            p.line([(29, 16), (30, 22), (28, 27)], CHROME)
            p.line([(21, 29), (31, 29)], INK, 2)
            p.poly([(31, 27), (34, 24), (38, 24), (41, 28)], light, dark)
            p.ellipse(31, 12, 6, 5, CHROME, INK)
            p.dot(35, 14, WHITE)
        elif model == 'honda-super-cub':
            p.poly([(8, 25), (12, 21), (18, 22), (24, 26), (28, 18), (32, 16), (32, 27), (27, 30), (18, 28)], base, dark)
            p.poly([(28, 17), (32, 18), (30, 27), (27, 28), (25, 24)], WHITE, STEEL)
            p.line([(8, 20), (15, 20)], CHROME, 2)
            p.line([(10, 19), (13, 19)], STEEL)
            p.ellipse(30, 12, 6, 5, CHROME, INK)
            p.dot(34, 14, WHITE)
            p.line([(32, 27), (36, 25), (40, 27)], light, 2)
        elif model == 'harley-davidson-fat-boy':
            p.poly([(7, 26), (8, 22), (13, 22), (18, 25), (17, 27)], base, STEEL)
            p.poly([(23, 18), (29, 17), (32, 20), (30, 23), (24, 23), (21, 21)], base, STEEL)
            p.line([(25, 18), (29, 18)], CHROME)
            p.line([(20, 24), (23, 28), (26, 24)], CHROME, 2)
            p.ellipse(31, 14, 7, 6, CHROME, INK)
            p.ellipse(34, 15, 3, 3, WHITE)
            p.line([(31, 27), (35, 25), (39, 25), (41, 28)], STEEL, 2)
        elif model == 'bmw-r1250-gs':
            p.poly([(14, 21), (18, 16), (27, 17), (32, 20), (38, 20), (36, 23), (30, 23), (27, 28), (18, 25)], base, STEEL)
            p.line([(19, 18), (24, 18), (28, 21)], '#316db3', 2)
            p.dot(25, 19, RED)
            p.rect(17, 25, 7, 5, STEEL)
            p.rect(18, 26, 5, 3, CHROME)
            p.line([(16, 23), (16, 30), (26, 30), (28, 25)], STEEL)
            p.rect(6, 21, 8, 8, STEEL)
            p.rect(7, 22, 6, 5, CHROME)
            p.rect(8, 21, 2, 2, INK)
            p.glass([(29, 15), (30, 8), (32, 9), (33, 15)])
            p.lamp(32, 16, w=5)
        else:
            outlines = {
                'ducati-panigale-v4': [(6, 18), (13, 17), (18, 20), (23, 15), (28, 15), (31, 18), (33, 14), (37, 15), (40, 20), (32, 22), (29, 30), (22, 31), (17, 26)],
                'kawasaki-ninja-h2': [(6, 17), (13, 16), (19, 20), (24, 15), (28, 16), (31, 19), (34, 13), (37, 15), (40, 20), (33, 24), (28, 31), (20, 29), (18, 24)],
                'yamaha-yzf-r1': [(6, 19), (12, 17), (18, 20), (23, 16), (28, 16), (31, 19), (34, 14), (38, 16), (40, 20), (33, 23), (30, 30), (22, 31), (16, 25)],
            }
            p.poly(outlines[model], base, dark)
            p.line([(22, 17), (26, 16), (29, 18)], shine)
            p.line([(22, 28), (28, 29), (32, 23)], light)
            p.glass([(32, 15), (33, 11), (35, 12), (37, 15)])
            p.lamp(36, 17, w=4)
            if model == 'ducati-panigale-v4':
                p.poly([(32, 21), (38, 20), (36, 23), (31, 23)], INK)
                p.line([(24, 23), (29, 21)], dark, 2)
            elif model == 'kawasaki-ninja-h2':
                p.line([(19, 22), (26, 25), (21, 27), (19, 22), (27, 21)], '#5baa69')
                p.line([(33, 21), (39, 20)], '#5baa69')
                p.rect(28, 20, 3, 3, INK)
            else:
                p.line([(19, 21), (27, 23)], CHROME, 2)
                p.rect(33, 18, 2, 2, INK)
                p.poly([(22, 28), (29, 28), (28, 30), (23, 30)], INK)
        # Seat must remain attached to avatar mounting at (24, 17..19).
        sy = spec['seat']['y']
        p.poly([(19, sy), (26, sy), (28, sy+2), (21, sy+3), (18, sy+1)], spec['colors']['saddle'], INK)
        p.line([(20, sy), (25, sy)], STEEL)
        p.line([(29, 16), (30, 13), (33, 13)], INK)
        if model in ('vespa-primavera-150', 'honda-super-cub', 'harley-davidson-fat-boy'):
            p.line([(30, 13), (28, 10)], STEEL)
            p.rect(27, 9, 3, 2, CHROME)
        if direction == 2:
            if model == 'harley-davidson-fat-boy':
                p.line([(25, 28), (18, 31), (7, 31)], CHROME, 2)
                p.line([(25, 30), (19, 33), (9, 33)], STEEL, 2)
            elif model != 'ducati-panigale-v4':
                p.line([(26, 29), (18, 32), (9, 29)], STEEL, 2)
                p.line([(10, 29), (17, 31)], CHROME)
            else:
                p.rect(23, 31, 6, 2, STEEL)
        else:
            p.line([(10, 31), (22, 29)], INK, 2)
            p.line([(11, 31), (21, 29)], STEEL)
            if model == 'honda-super-cub':
                p.line([(10, 30), (23, 28)], light, 3)
    if direction == 1:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return im


def motorcycle_vertical(spec, direction, frame):
    im = Image.new('RGBA', (48, 40))
    p = Pixel(im)
    model, base = spec['model'], spec['colors']['primary']
    dark, light, shine = tone(base, .55), tone(base, 1.3), tone(base, 1.6)
    rear = direction == 3
    p.ellipse(15, 35, 18, 4, (12, 20, 29, 65))
    tire_w = 5 if model == 'harley-davidson-fat-boy' else 3
    p.rect(24-tire_w//2, 24, tire_w, 14, INK)
    p.line([(24, 26), (24, 36)], STEEL)
    p.dot(24, 29+frame*2, RUBBER)
    if model == 'trek-marlin-7':
        p.line([(23, 11), (23, 30)], base, 2)
        p.line([(22, 26), (22, 33)], GOLD)
        p.line([(26, 26), (26, 33)], STEEL)
        p.rect(20, 17, 8, 3, INK)
        p.rect(21, 17, 5, 1, STEEL)
        p.line([(14, 23 if not rear else 12), (34, 23 if not rear else 12)], STEEL)
        p.rect(13, 22 if not rear else 11, 3, 3, INK)
        p.rect(33, 22 if not rear else 11, 3, 3, INK)
        p.rect(18, 28+frame%2, 3, 1, INK)
        p.rect(28, 29-frame%2, 3, 1, INK)
        p.lamp(22, 22 if rear else 24, rear, 4)
        return im
    silhouettes = {
        'vespa-primavera-150': [(21, 10), (27, 10), (30, 15), (31, 25), (28, 30), (20, 30), (17, 25), (18, 15)],
        'honda-super-cub': [(22, 9), (26, 9), (28, 15), (31, 23), (29, 29), (19, 29), (17, 23), (20, 15)],
        'harley-davidson-fat-boy': [(21, 9), (27, 9), (30, 14), (30, 22), (28, 27), (20, 27), (18, 22), (18, 14)],
        'bmw-r1250-gs': [(21, 7), (27, 7), (30, 12), (30, 20), (33, 24), (29, 28), (26, 32), (22, 32), (19, 28), (15, 24), (18, 20), (18, 12)],
        'ducati-panigale-v4': [(23, 7), (25, 7), (28, 12), (29, 17), (33, 23), (30, 28), (26, 31), (22, 31), (18, 28), (15, 23), (19, 17), (20, 12)],
        'kawasaki-ninja-h2': [(23, 6), (25, 6), (29, 12), (28, 18), (34, 23), (29, 29), (24, 32), (19, 29), (14, 23), (20, 18), (19, 12)],
        'yamaha-yzf-r1': [(22, 8), (26, 8), (29, 14), (29, 18), (32, 22), (30, 29), (26, 31), (22, 31), (18, 29), (16, 22), (19, 18), (19, 14)],
    }
    p.poly(silhouettes[model], base, dark)
    p.line([(21, 12), (21, 16), (19, 24), (21, 27)], light)
    p.line([(27, 12), (27, 17), (29, 23)], dark)
    p.rect(21, 17, 6, 6, spec['colors']['saddle'])
    p.line([(22, 17), (25, 17)], STEEL)
    hy = 12 if rear else 24
    p.line([(14, hy), (20, hy+1), (28, hy+1), (34, hy)], STEEL)
    p.rect(13, hy-1, 3, 3, INK)
    p.rect(33, hy-1, 3, 3, INK)
    if model == 'vespa-primavera-150':
        p.line([(19, 24), (20, 28), (28, 28), (29, 24)], CHROME)
        p.rect(23, 24, 2, 5, STEEL)
        p.ellipse(21, 22 if rear else 24, 6, 5, RED if rear else CHROME, INK)
        p.dot(23, 23 if rear else 25, '#fb8b8c' if rear else WHITE)
        p.line([(16, hy), (15, hy-4)], STEEL)
        p.rect(13, hy-5, 3, 2, CHROME)
        p.line([(32, hy), (33, hy-4)], STEEL)
        p.rect(33, hy-5, 3, 2, CHROME)
    elif model == 'honda-super-cub':
        if not rear:
            p.poly([(19, 23), (22, 25), (22, 30), (18, 28)], WHITE, STEEL)
            p.poly([(29, 23), (26, 25), (26, 30), (30, 28)], WHITE, STEEL)
        else:
            for y in (25, 27):
                p.line([(19, y), (29, y)], CHROME)
        p.ellipse(21, 23, 6, 5, RED if rear else CHROME, INK)
        p.dot(24, 24, '#ff9180' if rear else WHITE)
    elif model == 'harley-davidson-fat-boy':
        p.line([(19, 26), (19, 32)], CHROME, 2)
        p.line([(29, 26), (29, 32)], CHROME, 2)
        p.ellipse(20, 24, 8, 6, RED if rear else CHROME, INK)
        p.ellipse(22, 25, 4, 3, '#f77a87' if rear else WHITE)
        p.rect(31 if rear else 16, 28, 2, 7, STEEL)
    elif model == 'bmw-r1250-gs':
        for x in (12, 30):
            p.rect(x, 24, 6, 5, INK)
            p.rect(x+1, 25, 4, 3, CHROME)
        if rear:
            for x in (12, 30):
                p.rect(x, 15, 6, 8, STEEL)
                p.rect(x+1, 16, 4, 5, CHROME)
            p.lamp(21, 26, True, 6)
        else:
            p.glass([(21, 19), (27, 19), (29, 24), (19, 24)])
            p.rect(19, 25, 4, 3, CHROME)
            p.rect(26, 25, 3, 2, WHITE)
            p.poly([(20, 29), (28, 29), (25, 33), (23, 33)], light, dark)
    else:
        if rear:
            p.poly([(20, 24), (28, 24), (26, 28), (22, 28)], dark)
            p.lamp(21, 26, True, 6)
            p.rect(28, 30, 3, 4, STEEL)
        else:
            p.glass([(21, 20), (27, 20), (29, 25), (19, 25)])
            p.lamp(17, 25, w=5)
            p.lamp(27, 25, w=5)
            p.poly([(22, 28), (26, 28), (24, 30)], INK)
        if model == 'ducati-panigale-v4':
            p.rect(20, 31, 2, 4, GOLD)
            p.rect(27, 31, 2, 4, GOLD)
            p.line([(15, 25), (19, 27)], INK, 2)
            p.line([(29, 27), (33, 25)], INK, 2)
        elif model == 'kawasaki-ninja-h2':
            p.line([(18, 24), (19, 28), (22, 30)], '#65bb76')
            p.line([(30, 24), (29, 28), (26, 30)], '#65bb76')
            p.rect(22, 25, 4, 2, INK)
        else:
            p.dot(20, 27, WHITE)
            p.dot(28, 27, WHITE)
            p.line([(21, 29), (24, 31), (27, 29)], STEEL)
    return im


def render(spec, direction, frame):
    if spec['kind'] == 'car':
        im = car_side(spec, direction, frame) if direction in (1, 2) else car_vertical(spec, direction, frame)
    else:
        im = motorcycle_side(spec, direction, frame) if direction in (1, 2) else motorcycle_vertical(spec, direction, frame)
    if direction in (0, 3):
        # The exposed tread stays visible after fairings/body are composited.
        # Four distinct phases, no flashing lights or sliding ground plane.
        p = Pixel(im)
        for x in ((10, 37) if spec['kind'] == 'car' else (24,)):
            p.rect(x, 34, 1, 4, RUBBER)
            p.dot(x, 34 + (frame if direction == 0 else 3-frame), '#5a6573')
    return im
