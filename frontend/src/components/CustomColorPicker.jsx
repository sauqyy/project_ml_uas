import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pipette, X, ChevronDown } from 'lucide-react';

// --- Conversions Helpers ---
function hex2rgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }
    // Handle alpha hex if present, e.g. #3b82f6ff
    if (hex.length === 8) {
        hex = hex.slice(0, 6);
    }
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255];
}

function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

function hsv2rgb(h, s, v) {
    s /= 100;
    v /= 100;
    let k = (n) => (n + h / 60) % 6;
    let f = (n) => v * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return [Math.round(255 * f(5)), Math.round(255 * f(3)), Math.round(255 * f(1))];
}

function rgb2hex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hex2hsv(hex) {
    const [r, g, b] = hex2rgb(hex);
    return rgb2hsv(r, g, b);
}

// Default Swatches
const PALETTE_SWATCHES = [
    '#000000', '#FFFFFF', '#64748B', '#E2E8F0', '#475569', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
];

export default function CustomColorPicker({ value = '#3B82F6', onChange, onClose }) {
    const slBoardRef = useRef(null);

    // Color States
    const [h, setH] = useState(210);
    const [s, setS] = useState(100);
    const [v, setV] = useState(100);
    const [alpha, setAlpha] = useState(100); // 0 to 100
    const [hexInput, setHexInput] = useState('3B82F6');

    // Parse hex input on mount or change
    useEffect(() => {
        if (value) {
            try {
                const cleanHex = value.replace(/^#/, '');
                const baseHex = cleanHex.length >= 6 ? cleanHex.slice(0, 6) : cleanHex;
                const [nh, ns, nv] = hex2hsv('#' + baseHex);
                setH(nh);
                setS(ns);
                setV(nv);
                setHexInput(baseHex.toUpperCase());

                // If alpha exists in hex value, e.g. #3b82f680
                if (cleanHex.length === 8) {
                    const parsedAlpha = Math.round((parseInt(cleanHex.slice(6, 8), 16) / 255) * 100);
                    setAlpha(parsedAlpha);
                } else {
                    setAlpha(100);
                }
            } catch (e) {
                console.error("Invalid color value passed to custom picker", e);
            }
        }
    }, [value]);

    // Calculate solid color at current hue (for saturation board bg and alpha slider)
    const currentHueSolidColor = useMemo(() => {
        const [r, g, b] = hsv2rgb(h, 100, 100);
        return rgb2hex(r, g, b);
    }, [h]);

    // Calculate current final hex color
    const currentHexValue = useMemo(() => {
        const [r, g, b] = hsv2rgb(h, s, v);
        return rgb2hex(r, g, b);
    }, [h, s, v]);

    // Handle SL board coordinate click or drag
    const updateSlValue = (clientX, clientY) => {
        if (!slBoardRef.current) return;
        const rect = slBoardRef.current.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;

        // Constraint coordinates
        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        const newS = Math.round((x / rect.width) * 100);
        const newV = Math.round((1 - (y / rect.height)) * 100);

        setS(newS);
        setV(newV);

        // Notify parent
        const [r, g, b] = hsv2rgb(h, newS, newV);
        let finalHex = rgb2hex(r, g, b);
        if (alpha < 100) {
            const alphaHex = Math.round((alpha / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
            finalHex += alphaHex;
        }
        setHexInput(finalHex.replace('#', ''));
        if (onChange) onChange(finalHex);
    };

    const handleSlMouseDown = (e) => {
        e.preventDefault();
        updateSlValue(e.clientX, e.clientY);
        window.addEventListener('mousemove', handleSlMouseMove);
        window.addEventListener('mouseup', handleSlMouseUp);
    };

    const handleSlMouseMove = (e) => {
        updateSlValue(e.clientX, e.clientY);
    };

    const handleSlMouseUp = () => {
        window.removeEventListener('mousemove', handleSlMouseMove);
        window.removeEventListener('mouseup', handleSlMouseUp);
    };

    // Handle Hue Slider changes
    const handleHueChange = (e) => {
        const newH = parseInt(e.target.value);
        setH(newH);

        const [r, g, b] = hsv2rgb(newH, s, v);
        let finalHex = rgb2hex(r, g, b);
        if (alpha < 100) {
            const alphaHex = Math.round((alpha / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
            finalHex += alphaHex;
        }
        setHexInput(finalHex.replace('#', ''));
        if (onChange) onChange(finalHex);
    };

    // Handle Alpha Slider changes
    const handleAlphaChange = (e) => {
        const newAlpha = parseInt(e.target.value);
        setAlpha(newAlpha);

        const [r, g, b] = hsv2rgb(h, s, v);
        let finalHex = rgb2hex(r, g, b);
        if (newAlpha < 100) {
            const alphaHex = Math.round((newAlpha / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
            finalHex += alphaHex;
        }
        setHexInput(finalHex.replace('#', ''));
        if (onChange) onChange(finalHex);
    };

    // Handle manual HEX text field inputs
    const handleHexInputChange = (e) => {
        let text = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 8);
        setHexInput(text);

        if (text.length === 6) {
            const [nh, ns, nv] = hex2hsv('#' + text);
            setH(nh);
            setS(ns);
            setV(nv);
            setAlpha(100);
            if (onChange) onChange('#' + text);
        } else if (text.length === 8) {
            const [nh, ns, nv] = hex2hsv('#' + text.slice(0, 6));
            setH(nh);
            setS(ns);
            setV(nv);
            const parsedAlpha = Math.round((parseInt(text.slice(6, 8), 16) / 255) * 100);
            setAlpha(parsedAlpha);
            if (onChange) onChange('#' + text);
        }
    };

    // Handle manual opacity field input
    const handleAlphaInputChange = (e) => {
        let text = e.target.value.replace(/[^0-9]/g, '');
        if (text === '') {
            setAlpha(0);
            return;
        }
        let parsed = Math.min(100, Math.max(0, parseInt(text)));
        setAlpha(parsed);

        const [r, g, b] = hsv2rgb(h, s, v);
        let finalHex = rgb2hex(r, g, b);
        if (parsed < 100) {
            const alphaHex = Math.round((parsed / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
            finalHex += alphaHex;
        }
        setHexInput(finalHex.replace('#', ''));
        if (onChange) onChange(finalHex);
    };

    // EyeDropper API Integrator
    const triggerEyeDropper = () => {
        if (!window.EyeDropper) {
            alert("Maaf, EyeDropper API tidak didukung pada browser Anda.");
            return;
        }
        const eyeDropper = new window.EyeDropper();
        eyeDropper.open().then((result) => {
            if (result.sRGBHex) {
                const hex = result.sRGBHex;
                const [nh, ns, nv] = hex2hsv(hex);
                setH(nh);
                setS(ns);
                setV(nv);
                setAlpha(100);
                setHexInput(hex.replace('#', '').toUpperCase());
                if (onChange) onChange(hex);
            }
        }).catch((err) => {
            console.log("EyeDropper error:", err);
        });
    };

    return (
        <div className="custom-picker-popover">
            <style>{`
                .custom-picker-popover {
                    width: 240px;
                    background-color: #222222;
                    border-radius: 12px;
                    padding: 12px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
                    border: 1px solid #333333;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    color: #ffffff;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .custom-picker-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .custom-picker-title {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #cbd5e1;
                }
                .custom-picker-close {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                    border-radius: 4px;
                    transition: background 0.2s, color 0.2s;
                }
                .custom-picker-close:hover {
                    background: #333333;
                    color: #ffffff;
                }
                .custom-picker-sl-board {
                    position: relative;
                    width: 100%;
                    height: 140px;
                    border-radius: 8px;
                    cursor: crosshair;
                    overflow: hidden;
                }
                .custom-picker-sl-overlay {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(to top, #000000, transparent), 
                        linear-gradient(to right, #ffffff, transparent);
                }
                .custom-picker-sl-handle {
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    transform: translate(-7px, -7px);
                    pointer-events: none;
                }
                .custom-picker-sliders-section {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .custom-picker-eyedropper {
                    background: transparent;
                    border: none;
                    color: #cbd5e1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .custom-picker-eyedropper:hover {
                    background: #333333;
                    color: #ffffff;
                }
                .custom-picker-sliders {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex-grow: 1;
                }
                .custom-picker-slider-wrapper {
                    position: relative;
                    width: 100%;
                    height: 12px;
                }
                .custom-picker-range {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 10px;
                    border-radius: 5px;
                    outline: none;
                    margin: 0;
                    cursor: pointer;
                }
                .custom-picker-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 0 4px rgba(0,0,0,0.6);
                    background-color: transparent;
                    cursor: pointer;
                }
                .custom-picker-range::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2.5px solid #ffffff;
                    box-shadow: 0 0 4px rgba(0,0,0,0.6);
                    background-color: transparent;
                    cursor: pointer;
                }
                .custom-picker-inputs-row {
                    display: flex;
                    gap: 6px;
                    font-size: 0.75rem;
                }
                .custom-picker-format {
                    background-color: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 6px;
                    padding: 4px 6px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .custom-picker-hex-input {
                    background-color: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 6px;
                    padding: 4px 8px;
                    color: #ffffff;
                    width: 85px;
                    font-family: monospace;
                    font-weight: 700;
                    text-align: center;
                    outline: none;
                }
                .custom-picker-hex-input:focus {
                    border-color: #6366f1;
                }
                .custom-picker-alpha-wrapper {
                    display: flex;
                    align-items: center;
                    background-color: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 6px;
                    padding-right: 6px;
                    flex-grow: 1;
                }
                .custom-picker-alpha-input {
                    background-color: transparent;
                    border: none;
                    color: #ffffff;
                    width: 100%;
                    text-align: center;
                    font-weight: 700;
                    outline: none;
                    font-size: 0.75rem;
                    padding: 4px 2px;
                }
                .custom-picker-alpha-suffix {
                    color: #64748b;
                    font-weight: 700;
                }
                .custom-picker-swatches {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 2px;
                    padding-top: 10px;
                    border-top: 1px solid #333333;
                }
                .custom-picker-swatches-header {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .custom-picker-swatches-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .custom-picker-swatch {
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    transition: transform 0.1s;
                }
                .custom-picker-swatch:hover {
                    transform: scale(1.2);
                }
            `}</style>

            {/* Title block */}
            <div className="custom-picker-header">
                <span className="custom-picker-title">Custom</span>
                <button type="button" onClick={onClose} className="custom-picker-close">
                    <X size={14} />
                </button>
            </div>

            {/* Gradient board */}
            <div 
                ref={slBoardRef}
                onMouseDown={handleSlMouseDown}
                className="custom-picker-sl-board" 
                style={{ backgroundColor: currentHueSolidColor }}
            >
                <div className="custom-picker-sl-overlay" />
                <div 
                    className="custom-picker-sl-handle" 
                    style={{ left: `${s}%`, top: `${100 - v}%` }}
                />
            </div>

            {/* Controls row */}
            <div className="custom-picker-sliders-section">
                {/* Eyedropper API */}
                <button 
                    type="button" 
                    onClick={triggerEyeDropper} 
                    className="custom-picker-eyedropper"
                    title="Pilih warna dari layar"
                >
                    <Pipette size={14} />
                </button>

                <div className="custom-picker-sliders">
                    {/* Hue Slider */}
                    <div className="custom-picker-slider-wrapper">
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={h}
                            onChange={handleHueChange}
                            className="custom-picker-range"
                            style={{
                                background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                            }}
                        />
                    </div>

                    {/* Opacity Slider */}
                    <div className="custom-picker-slider-wrapper">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={alpha}
                            onChange={handleAlphaChange}
                            className="custom-picker-range"
                            style={{
                                background: `linear-gradient(to right, transparent, ${currentHexValue}), repeating-conic-gradient(#3a3a3a 0% 25%, #222 0% 50%) 50% / 8px 8px`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Input values row */}
            <div className="custom-picker-inputs-row">
                <div className="custom-picker-format">
                    Hex <ChevronDown size={10} />
                </div>
                <input 
                    type="text" 
                    value={hexInput} 
                    onChange={handleHexInputChange}
                    className="custom-picker-hex-input"
                />
                <div className="custom-picker-alpha-wrapper">
                    <input 
                        type="text" 
                        value={alpha} 
                        onChange={handleAlphaInputChange}
                        className="custom-picker-alpha-input"
                    />
                    <span className="custom-picker-alpha-suffix">%</span>
                </div>
            </div>

            {/* Swatches block */}
            <div className="custom-picker-swatches">
                <div className="custom-picker-swatches-header">
                    On this page <ChevronDown size={8} />
                </div>
                <div className="custom-picker-swatches-grid">
                    {PALETTE_SWATCHES.map((swatch) => (
                        <div 
                            key={swatch}
                            onClick={() => {
                                if (onChange) onChange(swatch);
                            }}
                            className="custom-picker-swatch"
                            style={{ backgroundColor: swatch }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
