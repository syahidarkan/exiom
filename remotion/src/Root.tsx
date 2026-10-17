import { Composition } from 'remotion';
import { VideoTemplate }    from './compositions/VideoTemplate.js';
import { GraphicTemplate }  from './compositions/GraphicTemplate.js';
import { CarouselTemplate } from './compositions/CarouselTemplate.js';

export const Root: React.FC = () => (
    <>
        <Composition
            id="VideoTemplate"
            component={VideoTemplate}
            durationInFrames={450}  // 15 detik @ 30fps
            fps={30}
            width={1080}
            height={1920}  // 9:16 untuk Reels/Shorts/TikTok
            defaultProps={{
                title: 'Judul Video Exiom',
                body: 'Isi konten di sini',
                ctaText: 'Hubungi Kami',
                brandColor: '#6366f1',
                logoUrl: '',
                audioUrl: '',
            }}
        />
        <Composition
            id="GraphicTemplate"
            component={GraphicTemplate}
            durationInFrames={1}
            fps={30}
            width={1080}
            height={1080}  // 1:1 untuk Feed IG
            defaultProps={{
                headline: 'Judul Graphic',
                subtext: 'Subtext di sini',
                brandColor: '#6366f1',
                logoUrl: '',
                backgroundStyle: 'gradient' as const,
            }}
        />
        <Composition
            id="CarouselTemplate"
            component={CarouselTemplate}
            durationInFrames={300}  // 10 detik, bisa di-scrub per slide
            fps={30}
            width={1080}
            height={1080}
            defaultProps={{
                slides: [
                    { heading: 'Slide 1', body: 'Isi slide 1' },
                    { heading: 'Slide 2', body: 'Isi slide 2' },
                    { heading: 'Slide 3', body: 'Isi slide 3' },
                ],
                brandColor: '#6366f1',
                logoUrl: '',
            }}
        />
    </>
);
