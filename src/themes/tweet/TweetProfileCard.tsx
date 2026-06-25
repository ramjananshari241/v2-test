import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { tweetAvatarSrc } from './tweetProfile'
import { tweetCardSurfaceClass } from './tweetFonts'

type TweetProfileCardProps = {
  profile?: ProfileWidgetType | null
}

export function TweetProfileCard({ profile }: TweetProfileCardProps) {
  const name = profile?.name?.trim() || 'PRO BLOG'
  const description = profile?.description?.trim() || ''
  const avatar = tweetAvatarSrc(profile)

  return (
    <div className={`${tweetCardSurfaceClass} p-6 text-center lg:text-left`}>
      <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 lg:mx-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-tweet text-2xl font-semibold text-neutral-300">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <h2 className="font-tweet text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {name}
      </h2>
      {description ? (
        <p className="mt-3 font-tweet text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      ) : null}
    </div>
  )
}
