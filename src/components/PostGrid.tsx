import CONFIG from '@/blog.config'
import { useScreenSize } from '../hooks/useScreenSize'
import { Post } from '../types/blog'
import { GridPostCard } from './card/PostCard'
import { Empty } from './Empty'

type PostGridProps = {
  posts: Post[]
  narrow?: boolean
  galleryFeedCovers?: Record<string, string> | null
}

const PostGrid = ({ posts, narrow, galleryFeedCovers }: PostGridProps) => {
  const { LARGE, MEDIUM, SMALL } = CONFIG.HOME_POSTS_COUNT

  const { isWidescreen } = useScreenSize()

  if (posts.length === 0) return <Empty />

  return (
    <ul className="my-4 grid grid-cols-6 gap-[1.625rem] lg:my-8 lg:gap-10">
      {posts.slice(0, LARGE).map((post) => (
        <li key={post.slug} className="col-span-6">
          <GridPostCard
            post={post}
            size="large"
            galleryCoverSrc={galleryFeedCovers?.[post.slug]}
          />
        </li>
      ))}
      {!narrow &&
        posts.slice(LARGE, LARGE + MEDIUM).map((post) => (
          <li
            key={post.slug}
            className="col-span-6 md:col-span-3 "
            data-aos="fade-up"
          >
            {isWidescreen ? (
              <GridPostCard
                post={post}
                size="medium"
                galleryCoverSrc={galleryFeedCovers?.[post.slug]}
              />
            ) : (
              <GridPostCard
                post={post}
                size="small"
                galleryCoverSrc={galleryFeedCovers?.[post.slug]}
              />
            )}
          </li>
        ))}
      {posts
        .slice(
          !narrow ? LARGE + MEDIUM : LARGE,
          !narrow ? LARGE + MEDIUM + SMALL : LARGE + MEDIUM + SMALL + 1
        )
        .map((post) => (
          <li
            key={post.slug}
            className="col-span-6 md:col-span-3 lg:col-span-2"
            data-aos="fade-up"
          >
            <GridPostCard
              post={post}
              size="small"
              galleryCoverSrc={galleryFeedCovers?.[post.slug]}
            />
          </li>
        ))}
    </ul>
  )
}

export default PostGrid