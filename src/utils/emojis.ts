/**
 * Emoji constants for console output
 * Using simple ASCII alternatives for better Windows terminal compatibility
 */

export const EMOJIS = {
    // Status indicators
    checkmark: '✓',
    cross: '✗',
    warning: '!',
    
    // Directional arrows
    up: '↑',
    down: '↓',
    equal: '→',
    
    // Priority levels
    critical: '[CRITICAL]',
    high: '[HIGH]',
    medium: '[MEDIUM]',
    low: '[LOW]',
    
    // Sections
    money: '$',
    chart: '📊',
    alert: '⚠',
    info: 'ℹ',
    star: '★',
    
    // Simple colored indicators (using text labels)
    red: '🔴',
    orange: '🟠',
    yellow: '🟡',
    green: '🟢',
};

// ASCII-only fallback for maximum compatibility
export const ASCII_ICONS = {
    checkmark: '[OK]',
    cross: '[X]',
    warning: '[!]',
    up: '^',
    down: 'v',
    equal: '-',
    critical: '[!!!]',
    high: '[!!]',
    medium: '[!]',
    low: '[·]',
    money: '$',
    chart: '[Chart]',
    alert: '[Alert]',
    info: '[Info]',
    star: '*',
    red: '[CRITICAL]',
    orange: '[HIGH]',
    yellow: '[MEDIUM]',
    green: '[LOW]',
};

// Use ASCII by default for Windows compatibility
export const ICONS = ASCII_ICONS;
