import {
    AbsoluteFill,
    Audio,
    Img,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';

export interface VideoTemplateProps {
    title:       string;
    body:        string;
    ctaText:     string;
    brandColor:  string;
    logoUrl:     string;
    audioUrl:    string;
}

export const VideoTemplate: React.FC<VideoTemplateProps> = ({
    title, body, ctaText, brandColor, logoUrl, audioUrl,
}) => {
    const frame  = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
    const bodyOpacity  = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' });
    const ctaOpacity   = interpolate(frame, [durationInFrames - 60, durationInFrames - 30], [0, 1], { extrapolateRight: 'clamp' });

    const titleY = spring({ frame, fps, config: { damping: 10 } });
    const titleTranslate = interpolate(titleY, [0, 1], [40, 0]);

    return (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, #0f0c29, ${brandColor}88, #302b63)` }}>
            {audioUrl ? <Audio src={audioUrl} /> : null}

            {/* Logo */}
            {logoUrl ? (
                <Img
                    src={logoUrl}
                    style={{
                        position: 'absolute',
                        top: 80,
                        left: 80,
                        width: 120,
                        height: 'auto',
                        opacity: titleOpacity,
                    }}
                />
            ) : (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    left: 80,
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#fff',
                    opacity: titleOpacity,
                    fontFamily: 'sans-serif',
                }}>
                    Exiom
                </div>
            )}

            {/* Title */}
            <div style={{
                position: 'absolute',
                top: '30%',
                left: 80,
                right: 80,
                opacity: titleOpacity,
                transform: `translateY(${titleTranslate}px)`,
                fontFamily: 'sans-serif',
            }}>
                <div style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.2,
                    textShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}>
                    {title}
                </div>
            </div>

            {/* Body */}
            <div style={{
                position: 'absolute',
                top: '55%',
                left: 80,
                right: 80,
                opacity: bodyOpacity,
                fontFamily: 'sans-serif',
            }}>
                <div style={{
                    fontSize: 36,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.6,
                }}>
                    {body}
                </div>
            </div>

            {/* CTA */}
            <div style={{
                position: 'absolute',
                bottom: 160,
                left: 80,
                right: 80,
                opacity: ctaOpacity,
                fontFamily: 'sans-serif',
            }}>
                <div style={{
                    display: 'inline-block',
                    background: brandColor,
                    color: '#fff',
                    fontSize: 40,
                    fontWeight: 700,
                    padding: '24px 48px',
                    borderRadius: 16,
                }}>
                    {ctaText}
                </div>
            </div>
        </AbsoluteFill>
    );
};
