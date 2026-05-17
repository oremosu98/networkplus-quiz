"""
Blender Topology Test — photoreal-ish home network rendering experiment.

Run inside Blender:
    1. Open Blender (4.0+ recommended).
    2. Switch to the "Scripting" workspace (top tabs: Layout, Modeling, ...,
       Scripting).
    3. In the script editor: Text → Open → select this file.
    4. Click "Run Script" (or hover in editor and press Alt+P).
    5. The 3D viewport should populate with: 5 devices + 4 cables + a floor +
       3-point lighting + a camera positioned for a 3/4 view.
    6. Render with F12. Scene is set up for Cycles (PBR-correct). For faster
       previews, change render engine to EEVEE in the Properties panel.

Topology being rendered (a small home network):

                [Firewall]
                    |
                    | Cat6
                    |
    [PC1] ──────[Switch]────── [Server]
                    |
                    | Cat6
                    |
                  [PC2]

Style direction: photoreal-ish PBR (per user pick — Style B).
- Switch: brushed metal chassis + emissive green status LEDs
- Firewall: glossy black plastic + matte black antennas
- PCs: matte plastic tower cases + power LEDs
- Server: rack-style metal chassis + drive-bay LEDs
- Cables: glossy blue PVC (Cat6 jacket look) routed as bezier curves
- Floor: matte concrete plane with subtle bump

Tweak the GLOBALS block below to iterate on layout / colors / camera angle.
"""

import bpy
import math
from mathutils import Vector


# ══════════════════════════════════════════
# GLOBALS — tweak these to iterate
# ══════════════════════════════════════════

# Device positions (Blender default: Z up, +Y forward, +X right)
# Layout spreads the 4 endpoints around the switch in a +-shape.
DEVICES = [
    {"name": "FW1",     "kind": "firewall", "location": (0.0,  4.0, 0.50)},
    {"name": "SW1",     "kind": "switch",   "location": (0.0,  0.0, 0.30)},
    {"name": "PC1",     "kind": "pc",       "location": (-4.0, 0.0, 1.00)},
    {"name": "PC2",     "kind": "pc",       "location": (0.0, -4.0, 1.00)},
    {"name": "Server1", "kind": "server",   "location": (4.0,  0.0, 0.80)},
]

# Cables connecting devices (by name). The script builds a bezier curve
# between the two devices' connection-point sockets.
CABLES = [
    ("FW1",  "SW1"),
    ("SW1",  "PC1"),
    ("SW1",  "PC2"),
    ("SW1",  "Server1"),
]

# Cable jacket color — matches the typical Cat6 blue. Try (0.7, 0.05, 0.05)
# for a red Cat6 look, or (0.05, 0.7, 0.1) for a green patch cable.
CABLE_COLOR = (0.05, 0.25, 0.7)

# Floor look — matte concrete grey
FLOOR_COLOR = (0.18, 0.18, 0.20)
FLOOR_ROUGHNESS = 0.85

# Camera look angle. (location, target). Adjust for different framing.
CAMERA_LOC = (8.0, -10.0, 7.0)
CAMERA_TARGET = (0.0, 0.0, 1.0)

# Render: Cycles for accuracy, EEVEE for speed. Change in Properties panel
# after running the script if you want to swap.
RENDER_ENGINE = "CYCLES"   # or "BLENDER_EEVEE_NEXT" / "BLENDER_EEVEE"
RENDER_SAMPLES = 128       # bump to 256+ for final renders, drop to 32 for preview


# ══════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════

def clear_scene():
    """Wipe everything from the default Blender scene."""
    # Delete all objects
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    # Purge orphan data so re-runs don't accumulate junk
    for collection in (
        bpy.data.meshes, bpy.data.curves, bpy.data.materials,
        bpy.data.lights, bpy.data.cameras, bpy.data.images
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def make_pbr_material(name, base_color, metallic=0.0, roughness=0.5, emission=None, emission_strength=2.0):
    """Create a Principled BSDF material with the given parameters.

    `emission` (4-tuple RGBA) lights up the surface — used for status LEDs.
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        return mat
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0) if len(base_color) == 3 else base_color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        # Newer Blender (4.0+) renamed "Emission" to "Emission Color"
        em_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if em_input is not None:
            em_input.default_value = (*emission, 1.0) if len(emission) == 3 else emission
        em_strength = bsdf.inputs.get("Emission Strength")
        if em_strength is not None:
            em_strength.default_value = emission_strength
    return mat


def assign_material(obj, mat):
    """Replace the object's material slot with mat."""
    if obj.data and hasattr(obj.data, "materials"):
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)


def add_box(name, location, size, parent=None, material=None):
    """Add a cuboid mesh at `location` with bounding box `size` (x, y, z)."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if parent is not None:
        obj.parent = parent
    if material is not None:
        assign_material(obj, material)
    return obj


def add_cylinder(name, location, radius, depth, axis="Z", parent=None, material=None):
    """Add a cylinder. axis selects orientation: 'X' / 'Y' / 'Z'."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if axis == "X":
        obj.rotation_euler = (0, math.radians(90), 0)
    elif axis == "Y":
        obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    if parent is not None:
        obj.parent = parent
    if material is not None:
        assign_material(obj, material)
    return obj


def make_empty_parent(name, location):
    """Create an empty object to act as a parent / pivot for a device group."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=location)
    obj = bpy.context.active_object
    obj.name = name
    return obj


# ══════════════════════════════════════════
# Device factories (by kind)
# ══════════════════════════════════════════

def build_firewall(name, location, materials):
    """Glossy black box + 2 antennas. Edge of the network."""
    parent = make_empty_parent(name, location)
    # Body — short wide rectangular block, ~0.8 wide × 0.5 deep × 0.25 tall
    add_box(f"{name}_body", location, (0.9, 0.55, 0.25), parent=parent, material=materials["plastic_glossy_black"])
    # Two antennas on the back, sticking up
    for i, dx in enumerate([-0.3, 0.3]):
        antenna_loc = (location[0] + dx, location[1] - 0.2, location[2] + 0.4)
        add_cylinder(f"{name}_antenna_{i}", antenna_loc, radius=0.025, depth=0.5,
                     parent=parent, material=materials["plastic_matte_black"])
        # Cap on top of each antenna
        cap_loc = (antenna_loc[0], antenna_loc[1], antenna_loc[2] + 0.27)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=cap_loc)
        sphere = bpy.context.active_object
        sphere.name = f"{name}_antenna_cap_{i}"
        sphere.parent = parent
        assign_material(sphere, materials["plastic_matte_black"])
    # Front status LED (green = healthy)
    led_loc = (location[0] + 0.35, location[1] + 0.27, location[2] + 0.05)
    add_cylinder(f"{name}_led", led_loc, radius=0.025, depth=0.02, axis="Y",
                 parent=parent, material=materials["led_green"])
    return parent


def build_switch(name, location, materials):
    """Brushed metal chassis + row of 8 status LEDs on the front."""
    parent = make_empty_parent(name, location)
    # Wider, flatter chassis — 1.2m wide, 0.4m deep, 0.18m tall
    body = add_box(f"{name}_body", location, (1.2, 0.4, 0.18),
                   parent=parent, material=materials["metal_brushed"])
    # 8 LEDs in a row across the front
    for i in range(8):
        led_x = location[0] - 0.5 + i * 0.14
        led_loc = (led_x, location[1] + 0.21, location[2] + 0.01)
        # Mix green + amber to look more realistic — alternate colors
        led_mat = materials["led_green"] if i % 2 == 0 else materials["led_amber"]
        add_cylinder(f"{name}_led_{i}", led_loc, radius=0.022, depth=0.015,
                     axis="Y", parent=parent, material=led_mat)
    # Brand strip on the front (slight indent — just a darker thin box)
    strip_loc = (location[0] + 0.4, location[1] + 0.21, location[2] + 0.06)
    add_box(f"{name}_brand", strip_loc, (0.3, 0.005, 0.04),
            parent=parent, material=materials["plastic_matte_black"])
    return parent


def build_pc(name, location, materials):
    """Tower case — taller cuboid with front power LED."""
    parent = make_empty_parent(name, location)
    # Tower body — 0.4 × 0.5 × 1.0
    add_box(f"{name}_body", location, (0.4, 0.5, 1.0),
            parent=parent, material=materials["plastic_matte_dark"])
    # Front bezel (lighter grey vertical strip)
    bezel_loc = (location[0], location[1] + 0.26, location[2])
    add_box(f"{name}_bezel", bezel_loc, (0.35, 0.005, 0.95),
            parent=parent, material=materials["plastic_glossy_black"])
    # Power LED on the front, near the top
    led_loc = (location[0] - 0.10, location[1] + 0.27, location[2] + 0.40)
    add_cylinder(f"{name}_led", led_loc, radius=0.018, depth=0.015,
                 axis="Y", parent=parent, material=materials["led_blue"])
    return parent


def build_server(name, location, materials):
    """Rack-style chassis — wider than tall, with multiple drive-bay LEDs."""
    parent = make_empty_parent(name, location)
    # 1.4 wide × 0.6 deep × 0.5 tall — like a 2U rack server
    add_box(f"{name}_body", location, (1.4, 0.6, 0.5),
            parent=parent, material=materials["metal_brushed_dark"])
    # Front "drive bays" — 6 small slots
    for i in range(6):
        bay_x = location[0] - 0.55 + i * 0.22
        bay_loc = (bay_x, location[1] + 0.31, location[2])
        add_box(f"{name}_bay_{i}", bay_loc, (0.18, 0.005, 0.30),
                parent=parent, material=materials["plastic_matte_black"])
        # LED on each bay
        led_loc = (bay_x + 0.07, location[1] + 0.32, location[2] + 0.10)
        add_cylinder(f"{name}_bay_led_{i}", led_loc, radius=0.012, depth=0.012,
                     axis="Y", parent=parent, material=materials["led_green"])
    # Top status LED row (3 LEDs on the right side near top)
    for i in range(3):
        led_x = location[0] + 0.5 + i * 0.05
        led_loc = (led_x, location[1] + 0.31, location[2] + 0.20)
        add_cylinder(f"{name}_status_led_{i}", led_loc, radius=0.012, depth=0.012,
                     axis="Y", parent=parent, material=materials["led_amber"])
    return parent


DEVICE_FACTORIES = {
    "firewall": build_firewall,
    "switch":   build_switch,
    "pc":       build_pc,
    "server":   build_server,
}


# ══════════════════════════════════════════
# Cables — bezier curves between devices
# ══════════════════════════════════════════

def add_cable(name, start_loc, end_loc, material, radius=0.04):
    """Create a bezier curve from start to end with a tube bevel + sag.

    The midpoint is offset downward to give the cable a natural sag.
    """
    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 4
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(2)  # we want 3 points total (start, mid, end)

    # Start point
    spline.bezier_points[0].co = start_loc
    spline.bezier_points[0].handle_left = start_loc
    spline.bezier_points[0].handle_right = (
        start_loc[0] + (end_loc[0] - start_loc[0]) * 0.3,
        start_loc[1] + (end_loc[1] - start_loc[1]) * 0.3,
        start_loc[2] - 0.2,  # dip downward at the start handle
    )

    # Midpoint — sags below the average height
    mid = (
        (start_loc[0] + end_loc[0]) / 2,
        (start_loc[1] + end_loc[1]) / 2,
        min(start_loc[2], end_loc[2]) - 0.15,
    )
    spline.bezier_points[1].co = mid
    spline.bezier_points[1].handle_left = (mid[0] - 0.3, mid[1], mid[2])
    spline.bezier_points[1].handle_right = (mid[0] + 0.3, mid[1], mid[2])

    # End point
    spline.bezier_points[2].co = end_loc
    spline.bezier_points[2].handle_left = (
        end_loc[0] - (end_loc[0] - start_loc[0]) * 0.3,
        end_loc[1] - (end_loc[1] - start_loc[1]) * 0.3,
        end_loc[2] - 0.2,
    )
    spline.bezier_points[2].handle_right = end_loc

    # Smooth the handles for a natural curve
    for bp in spline.bezier_points:
        bp.handle_left_type = "ALIGNED"
        bp.handle_right_type = "ALIGNED"

    obj = bpy.data.objects.new(name=name, object_data=curve_data)
    bpy.context.collection.objects.link(obj)
    if material is not None:
        assign_material(obj, material)
    return obj


# ══════════════════════════════════════════
# Lighting + camera + floor
# ══════════════════════════════════════════

def setup_lighting():
    """Three-point lighting: key (warm), fill (cool), rim (back/top)."""
    # Key light — large area light, slightly warm, top-right
    bpy.ops.object.light_add(type="AREA", location=(6.0, -6.0, 8.0))
    key = bpy.context.active_object
    key.name = "Key_Light"
    key.data.energy = 800.0
    key.data.size = 4.0
    key.data.color = (1.0, 0.95, 0.85)  # warm
    key.rotation_euler = (math.radians(45), math.radians(20), math.radians(-30))

    # Fill light — softer area light, cool, top-left
    bpy.ops.object.light_add(type="AREA", location=(-6.0, -3.0, 6.0))
    fill = bpy.context.active_object
    fill.name = "Fill_Light"
    fill.data.energy = 300.0
    fill.data.size = 5.0
    fill.data.color = (0.85, 0.9, 1.0)   # cool
    fill.rotation_euler = (math.radians(45), math.radians(-15), math.radians(30))

    # Rim/back light — separates the topology from the floor
    bpy.ops.object.light_add(type="SPOT", location=(0.0, 8.0, 6.0))
    rim = bpy.context.active_object
    rim.name = "Rim_Light"
    rim.data.energy = 500.0
    rim.data.spot_size = math.radians(80)
    rim.data.spot_blend = 0.5
    rim.rotation_euler = (math.radians(135), 0, 0)


def setup_camera(location, target):
    """Create a camera at `location` aiming at `target`."""
    bpy.ops.object.camera_add(location=location)
    cam = bpy.context.active_object
    cam.name = "Camera_Hero"
    # Point camera at target via track-to constraint
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=target)
    target_empty = bpy.context.active_object
    target_empty.name = "Camera_Target"
    constraint = cam.constraints.new(type="TRACK_TO")
    constraint.target = target_empty
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    # Set as active camera
    bpy.context.scene.camera = cam
    # Slight depth of field for cinematic look
    cam.data.dof.use_dof = True
    cam.data.dof.focus_object = target_empty
    cam.data.dof.aperture_fstop = 4.0
    cam.data.lens = 50  # 50mm — natural perspective


def add_floor(material):
    """Large concrete plane underneath the topology."""
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    assign_material(floor, material)
    # Slight subdivision so any modifier-based bump works correctly
    return floor


def setup_render():
    """Set Cycles + sane render defaults."""
    scene = bpy.context.scene
    try:
        scene.render.engine = RENDER_ENGINE
    except TypeError:
        scene.render.engine = "CYCLES"  # fallback if user version doesn't support our enum
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = RENDER_SAMPLES
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    # Set a subtle blue-tinted world background
    bg = scene.world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs["Color"].default_value = (0.04, 0.05, 0.07, 1.0)
        bg.inputs["Strength"].default_value = 0.3


# ══════════════════════════════════════════
# Main
# ══════════════════════════════════════════

def main():
    print("=" * 60)
    print("Blender Topology Test — building scene...")
    print("=" * 60)

    clear_scene()

    # Build the material library once — reused across all devices
    materials = {
        "metal_brushed":        make_pbr_material("Metal_Brushed",
                                                  base_color=(0.55, 0.57, 0.6),
                                                  metallic=1.0, roughness=0.35),
        "metal_brushed_dark":   make_pbr_material("Metal_Brushed_Dark",
                                                  base_color=(0.25, 0.27, 0.30),
                                                  metallic=1.0, roughness=0.45),
        "plastic_glossy_black": make_pbr_material("Plastic_Glossy_Black",
                                                  base_color=(0.04, 0.04, 0.04),
                                                  metallic=0.0, roughness=0.20),
        "plastic_matte_black":  make_pbr_material("Plastic_Matte_Black",
                                                  base_color=(0.06, 0.06, 0.07),
                                                  metallic=0.0, roughness=0.75),
        "plastic_matte_dark":   make_pbr_material("Plastic_Matte_Dark",
                                                  base_color=(0.10, 0.10, 0.12),
                                                  metallic=0.0, roughness=0.65),
        "led_green":            make_pbr_material("LED_Green",
                                                  base_color=(0.05, 0.05, 0.05),
                                                  metallic=0.0, roughness=0.3,
                                                  emission=(0.1, 1.0, 0.2),
                                                  emission_strength=8.0),
        "led_amber":            make_pbr_material("LED_Amber",
                                                  base_color=(0.05, 0.05, 0.05),
                                                  metallic=0.0, roughness=0.3,
                                                  emission=(1.0, 0.6, 0.05),
                                                  emission_strength=8.0),
        "led_blue":             make_pbr_material("LED_Blue",
                                                  base_color=(0.05, 0.05, 0.05),
                                                  metallic=0.0, roughness=0.3,
                                                  emission=(0.05, 0.4, 1.0),
                                                  emission_strength=6.0),
        "cable_cat6":           make_pbr_material("Cable_Cat6",
                                                  base_color=CABLE_COLOR,
                                                  metallic=0.0, roughness=0.4),
        "floor_concrete":       make_pbr_material("Floor_Concrete",
                                                  base_color=FLOOR_COLOR,
                                                  metallic=0.0, roughness=FLOOR_ROUGHNESS),
    }

    # Floor first (so it's z-stacked underneath devices)
    add_floor(materials["floor_concrete"])

    # Build devices, keep a name → location mapping for the cable pass
    name_to_loc = {}
    for dev in DEVICES:
        factory = DEVICE_FACTORIES.get(dev["kind"])
        if factory is None:
            print(f"  ⚠ Unknown device kind: {dev['kind']}")
            continue
        factory(dev["name"], dev["location"], materials)
        name_to_loc[dev["name"]] = dev["location"]
        print(f"  + Built {dev['kind']}: {dev['name']} at {dev['location']}")

    # Cables — connect by looking up the two endpoint locations
    for src, dst in CABLES:
        if src not in name_to_loc or dst not in name_to_loc:
            print(f"  ⚠ Cable references unknown device: {src} / {dst}")
            continue
        # Slightly offset cable endpoints so they emerge from the device top/side
        # rather than from the dead centre.
        a = name_to_loc[src]
        b = name_to_loc[dst]
        a_offset = (a[0], a[1], a[2] + 0.1)
        b_offset = (b[0], b[1], b[2] + 0.1)
        add_cable(f"Cable_{src}_{dst}", a_offset, b_offset, materials["cable_cat6"])
        print(f"  + Cable: {src} → {dst}")

    setup_lighting()
    setup_camera(CAMERA_LOC, CAMERA_TARGET)
    setup_render()

    print("=" * 60)
    print("Scene built. Press F12 to render, or check the 3D viewport.")
    print(f"Camera: {CAMERA_LOC} → target {CAMERA_TARGET}")
    print(f"Render engine: {bpy.context.scene.render.engine}")
    print(f"Samples: {RENDER_SAMPLES}")
    print("=" * 60)


if __name__ == "__main__":
    main()
