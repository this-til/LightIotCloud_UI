// Color preset mapping based on your model definitions
export const colorPresetMap = {
    "车祸": {
        "车祸": [255, 0, 0]
    },
    "倒地": {
        "摔倒": [255, 150, 51],
        "站立": [100, 255, 100]
    },
    "车型": {
        "电动车": [255, 0, 255],
        "自行车": [255, 128, 255],
        "公交": [255, 255, 0],
        "汽车": [0, 0, 255],
        "行人": [0, 255, 0],
        "卡车": [255, 0, 0]
    },
    "人脸": {
        "人脸": [255, 255, 255]
    },
    "积水": {
        "积水": [0, 0, 255]
    }
};

// Cache for generated colors
const generatedColorCache = {};

/**
 * Generate a random bright color (high saturation and value)
 * @returns RGB color as [number, number, number]
 */
function generateRandomBrightColor() {
    // Generate hue (0-360)
    const hue = Math.floor(Math.random() * 360);

    // Fixed high saturation (80-100%)
    const saturation = 80 + Math.random() * 20;

    // Fixed high value (80-100%)
    const value = 80 + Math.random() * 20;

    // Convert HSV to RGB
    return hsvToRgb(hue, saturation, value);
}

/**
 * Convert HSV color to RGB
 */
function hsvToRgb(h, s, v) {
    s /= 100;
    v /= 100;

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
        [r, g, b] = [x, 0, c];
    } else if (300 <= h && h < 360) {
        [r, g, b] = [c, 0, x];
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

/**
 * Get color preset for a model and item
 * @param modelName Chinese model name (e.g., "车祸", "倒地")
 * @param itemName Chinese item name (e.g., "电动车", "摔倒")
 * @returns RGB color as [number, number, number]
 */
export function getColorPreset(modelName, itemName) {
    // Check preset colors first
    if (colorPresetMap[modelName]?.[itemName]) {
        return colorPresetMap[modelName][itemName];
    }

    // Initialize cache if needed
    if (!generatedColorCache[modelName]) {
        generatedColorCache[modelName] = {};
    }

    // Return cached color if exists
    if (generatedColorCache[modelName][itemName]) {
        return generatedColorCache[modelName][itemName];
    }

    // Generate and cache new color
    const newColor = generateRandomBrightColor();
    generatedColorCache[modelName][itemName] = newColor;
    return newColor;
}
