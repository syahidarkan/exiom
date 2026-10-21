import React from "react";
import {Composition} from "remotion";
import {ReelComp} from "./Reel";
import {REELS} from "./data/all";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {REELS.map((reel) => {
      const total = reel.scenes.reduce((sum, s) => sum + Math.round(s.seconds * FPS), 0);
      return (
        <Composition
          key={reel.id}
          id={reel.id}
          component={ReelComp}
          durationInFrames={total}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{reel}}
        />
      );
    })}
  </>
);
