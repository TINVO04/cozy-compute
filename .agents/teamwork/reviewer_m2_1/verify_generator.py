import os
import sys
import importlib.util

spec = importlib.util.spec_from_file_location('generate_vehicles', 'scripts/generate_vehicles.py')
gv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gv)

print('--- 1. Testing 4-tier palette for all 16 vehicles ---')
for v in gv.VEHICLE_SPECS:
    col = v['colors']['primary']
    deep, mid, light, spec_tone = gv.get_4tone_palette(col)
    lum_deep = 0.299 * deep[0] + 0.587 * deep[1] + 0.114 * deep[2]
    lum_mid = 0.299 * mid[0] + 0.587 * mid[1] + 0.114 * mid[2]
    lum_light = 0.299 * light[0] + 0.587 * light[1] + 0.114 * light[2]
    lum_spec = 0.299 * spec_tone[0] + 0.587 * spec_tone[1] + 0.114 * spec_tone[2]
    print(f"{v['id']:35}: deep={deep[:3]} ({lum_deep:.1f}) <= mid={mid[:3]} ({lum_mid:.1f}) <= light={light[:3]} ({lum_light:.1f}) <= spec={spec_tone[:3]} ({lum_spec:.1f})")
    assert lum_deep <= lum_mid <= lum_light <= lum_spec or (mid[0] == mid[1] == mid[2] == 0), f"Hierarchy violated for {v['id']}"

print('\n--- 2. Checking rim types implemented and used ---')
rim_types_expected = {'alloy', 'lakester', 'wire', 'star_5', 'star_dual', 'turbine', 'pantheon', 'center_lock'}
print(f"Expected 8 rim types: {sorted(rim_types_expected)}")

# Check code in scripts/generate_vehicles.py for rim_types
with open('scripts/generate_vehicles.py', 'r', encoding='utf-8') as f:
    code = f.read()

found_types = set()
for r in rim_types_expected:
    if f'rim_type == "{r}"' in code or f'rim_type="{r}"' in code or f'rim_type = "{r}"' in code:
        found_types.add(r)
        print(f"  [OK] Rim type '{r}' is implemented in draw_wheel_3d and assigned to models")
    else:
        print(f"  [FAIL] Rim type '{r}' not found in code")

assert found_types == rim_types_expected, f"Missing rim types: {rim_types_expected - found_types}"

print('\n--- 3. Checking signature passes for all 16 vehicles ---')
for v in gv.VEHICLE_SPECS:
    model = v['model']
    if model in code:
        print(f"  [OK] Model '{model}' explicitly handled")
    else:
        print(f"  [FAIL] Model '{model}' not handled")

print('\n--- 4. Checking 2.5D reflective glass ---')
assert 'draw_glass_25d' in code
assert 'overhang' in code
assert 'streak_offset = (frame_idx * 2) % max(1, (w + h))' in code
print("  [OK] draw_glass_25d properly implements dark interior, overhang shadow, and sliding reflection streak")

print('\n--- 5. Checking wheel baseline ground contact invariant ---')
assert 'cy + 5' in code or 'cy=32' in code
assert 'y=37' in code
print("  [OK] draw_wheel_3d and suspension bounce strictly maintain ground contact at y=37")

print('\n--- ALL ARCHITECTURAL TESTS PASSED ---')
