import { Composition, continueRender, delayRender } from 'remotion'
import { FILM_SECONDS } from './edit'
import { Film } from './Film'
import { fontsReady } from './fonts'

const wait = delayRender('fonts')
fontsReady.then(() => continueRender(wait))

export const Root = () => (
  <>
    <Composition
      id="Film"
      component={Film}
      durationInFrames={Math.round(FILM_SECONDS * 30)}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
)
