export const colors = {
    // Black and white glass system
    bg: '#F7F7F4',
    bgWarm: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceBlue: 'rgba(0,0,0,0.055)',
    surfacePink: 'rgba(0,0,0,0.075)',
    surfaceMuted: 'rgba(0,0,0,0.06)',
    card: '#FFFFFF',
    border: 'rgba(0,0,0,0.11)',
    borderPink: 'rgba(0,0,0,0.13)',

    // Typography
    text: '#080808',
    muted: '#666666',
    soft: 'rgba(0,0,0,0.44)',

    // Monochrome accents
    primary: '#080808',
    primarySoft: 'rgba(0,0,0,0.07)',
    primaryDeep: '#000000',
    
    accent: '#080808',
    accentSoft: 'rgba(0,0,0,0.08)',
    accentDeep: '#000000',

    // Status
    success: '#080808',
    successSoft: 'rgba(0,0,0,0.07)',
    warning: '#3A3A3A',
    warningSoft: 'rgba(0,0,0,0.09)',
    danger: '#000000',
    dangerSoft: 'rgba(0,0,0,0.12)',

    // Glass & Utilities
    glass: '#FFFFFF',
    glassDark: 'rgba(0,0,0,0.82)',
    glassBorder: 'rgba(0,0,0,0.12)',
    skeleton: 'rgba(0,0,0,0.075)',
};

export const getTheme = (darkMode: boolean) => ({
    bg: darkMode ? '#111111' : colors.bg,
    bgWarm: darkMode ? '#1a1a1a' : colors.bgWarm,
    surface: darkMode ? '#1f1f1f' : colors.surface,
    surfaceBlue: darkMode ? 'rgba(255,255,255,0.06)' : colors.surfaceBlue,
    surfacePink: darkMode ? 'rgba(255,255,255,0.08)' : colors.surfacePink,
    surfaceMuted: darkMode ? 'rgba(255,255,255,0.07)' : colors.surfaceMuted,
    card: darkMode ? '#1a1a1a' : colors.card,
    border: darkMode ? 'rgba(255,255,255,0.12)' : colors.border,
    borderPink: darkMode ? 'rgba(255,255,255,0.15)' : colors.borderPink,
    text: darkMode ? '#FFFFFF' : colors.text,
    muted: darkMode ? '#AAAAAA' : colors.muted,
    soft: darkMode ? 'rgba(255,255,255,0.5)' : colors.soft,
    primary: darkMode ? '#FFFFFF' : colors.primary,
    primarySoft: darkMode ? 'rgba(255,255,255,0.12)' : colors.primarySoft,
    primaryDeep: darkMode ? '#FFFFFF' : colors.primaryDeep,
    accent: darkMode ? '#FFFFFF' : colors.accent,
    accentSoft: darkMode ? 'rgba(255,255,255,0.12)' : colors.accentSoft,
    accentDeep: darkMode ? '#FFFFFF' : colors.accentDeep,
    success: darkMode ? '#FFFFFF' : colors.success,
    successSoft: darkMode ? 'rgba(255,255,255,0.12)' : colors.successSoft,
    warning: darkMode ? '#CCCCCC' : colors.warning,
    warningSoft: darkMode ? 'rgba(255,255,255,0.12)' : colors.warningSoft,
    danger: darkMode ? '#FF6B6B' : colors.danger,
    dangerSoft: darkMode ? 'rgba(255,107,107,0.15)' : colors.dangerSoft,
    glass: darkMode ? '#1a1a1a' : colors.glass,
    glassDark: darkMode ? 'rgba(255,255,255,0.82)' : colors.glassDark,
    glassBorder: darkMode ? 'rgba(255,255,255,0.14)' : colors.glassBorder,
    skeleton: darkMode ? 'rgba(255,255,255,0.1)' : colors.skeleton,
});

export const shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 5,
};
