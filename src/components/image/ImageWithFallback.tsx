import NextImage, { ImageProps } from 'next/image'
import { useState } from 'react'
import { FaQuestionCircle } from 'react-icons/fa'
import { RxLinkBreak2 } from 'react-icons/rx'

const ImageWithFallback = (
  props: ImageProps & { fallbackSrc: string; isIcon?: boolean }
) => {
  const { fallbackSrc, alt, isIcon, ...rest } = props
  const initialSrc = props.src as string
  const [imgSrc, setImgSrc] = useState(initialSrc)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const isNotionHosted = imgSrc.includes('secure.notion-static.com')
  const showBrokenIcon = failedSrc === fallbackSrc

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setFailedSrc(imgSrc)
      setImgSrc(fallbackSrc)
      return
    }
    setFailedSrc(fallbackSrc)
  }

  if (showBrokenIcon) {
    if (isIcon === true) {
      return <FaQuestionCircle className="h-full w-full opacity-30" />
    }
    return (
      <div className="relative z-0 flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-800">
        <RxLinkBreak2 className="h-1/3 w-1/3 opacity-30" />
      </div>
    )
  }

  return (
    <NextImage
      {...rest}
      src={imgSrc}
      onError={handleError}
      unoptimized={props.unoptimized || isNotionHosted}
      alt={alt}
    />
  )
}

export default ImageWithFallback
