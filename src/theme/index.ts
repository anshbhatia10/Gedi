// Premium dark theme with liquid glass aesthetic
export const colors = {
    // Core
    background: "#000000",
    surface: "rgba(255, 255, 255, 0.03)",
    surfaceLight: "rgba(255, 255, 255, 0.08)",

    // Glass effects
    glass: "rgba(255, 255, 255, 0.06)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassHighlight: "rgba(255, 255, 255, 0.15)",

    // Text
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.7)",
    textMuted: "rgba(255, 255, 255, 0.4)",
    textDim: "rgba(255, 255, 255, 0.25)",

    // Border
    border: "rgba(255, 255, 255, 0.08)",
    borderLight: "rgba(255, 255, 255, 0.15)",

    // Accent - subtle orange
    accent: "#FF6B35",
    accentMuted: "rgba(255, 107, 53, 0.3)",
    accentGlow: "rgba(255, 107, 53, 0.15)",

    // Status
    success: "#32D74B",
    successMuted: "rgba(50, 215, 75, 0.2)",
    error: "#FF453A",
    warning: "#FFD60A",
};

export const gradients = {
    accent: ["#FF6B35", "#FF8F5A"],
    glass: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.02)"],
    dark: ["rgba(0,0,0,0.8)", "rgba(0,0,0,0)"],
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
};

export const typography = {
    largeTitle: {
        fontSize: 34,
        fontWeight: "700" as const,
        letterSpacing: -0.5,
    },
    title: {
        fontSize: 28,
        fontWeight: "600" as const,
        letterSpacing: -0.3,
    },
    headline: {
        fontSize: 17,
        fontWeight: "600" as const,
    },
    body: {
        fontSize: 15,
        fontWeight: "400" as const,
    },
    caption: {
        fontSize: 13,
        fontWeight: "500" as const,
    },
    micro: {
        fontSize: 11,
        fontWeight: "500" as const,
        letterSpacing: 0.3,
        textTransform: "uppercase" as const,
    },
};

export const shadows = {
    glass: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    subtle: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
};
