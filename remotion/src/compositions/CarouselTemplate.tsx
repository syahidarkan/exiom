import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface CarouselSlide {
    heading: string;
    body:    string;
    imageUrl?: string;
}

export interface CarouselTemplateProps {
    slides:     CarouselSlide[];
    brandColor: string;
    logoUrl:    string;
}

export const CarouselTemplate: React.FC<CarouselTemplateProps> = ({
    slides, brandColor, logoUrl,
}) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const framesPerSlide = Math.floor(durationInFrames / slides.length);
    const currentSlide   = Math.min(Math.floor(frame / framesPerSlide), slides.length - 1);
    const frameInSlide   = frame - currentSlide * framesPerSlide;

    const slide = slides[currentSlide];
    const opacity = interpolate(frameInSlide, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, #0f0c29, ${brandColor}99)` }}>
            {/* Logo */}
            {logoUrl ? (
                <Img src={logoUrl} style={{ position: 'absolute', top: 60, left: 60, width: 90, height: 'auto' }} />
            ) : (
                <div style={{ position: 'absolute', top: 60, left: 60, fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'sans-serif' }}>
                    Exiom
                </div>
            )}

            {/* Slide counter dots */}
            <div style={{
                position: 'absolute',
                top: 68,
                right: 60,
                display: 'flex',
                gap: 10,
            }}>
                {slides.map((_, i) => (
                    <div key={i} style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.3)',
                    }} />
                ))}
            </div>

            {/* Slide content */}
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '140px 80px 140px',
                fontFamily: 'sans-serif',
                opacity,
            }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 36 }}>
                    {slide.heading}
                </div>
                <div style={{ fontSize: 38, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                    {slide.body}
                </div>
            </div>

            {/* Bottom progress bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 8,
                background: 'rgba(255,255,255,0.15)',
            }}>
                <div style={{
                    height: '100%',
                    width: `${((currentSlide + 1) / slides.length) * 100}%`,
                    background: brandColor,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </AbsoluteFill>
    );
};
