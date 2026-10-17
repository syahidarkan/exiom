import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

export interface GraphicTemplateProps {
    headline:        string;
    subtext:         string;
    brandColor:      string;
    logoUrl:         string;
    backgroundStyle: 'gradient' | 'solid' | 'dark';
}

export const GraphicTemplate: React.FC<GraphicTemplateProps> = ({
    headline, subtext, brandColor, logoUrl, backgroundStyle,
}) => {
    const frame   = useCurrentFrame();
    const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

    const bg: React.CSSProperties['background'] =
        backgroundStyle === 'gradient'
            ? `linear-gradient(135deg, #0f0c29, ${brandColor}cc)`
            : backgroundStyle === 'dark'
            ? '#111'
            : brandColor;

    return (
        <AbsoluteFill style={{ background: bg, opacity }}>
            {/* Logo top-left */}
            {logoUrl ? (
                <Img src={logoUrl} style={{ position: 'absolute', top: 60, left: 60, width: 100, height: 'auto' }} />
            ) : (
                <div style={{ position: 'absolute', top: 60, left: 60, fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'sans-serif' }}>
                    Exiom
                </div>
            )}

            {/* Centered content */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 80,
                fontFamily: 'sans-serif',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 32 }}>
                    {headline}
                </div>
                <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                    {subtext}
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 12,
                background: brandColor,
                opacity: 0.6,
            }} />
        </AbsoluteFill>
    );
};
