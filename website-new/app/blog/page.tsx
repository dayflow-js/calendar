import { blog } from 'fumadocs-mdx:collections/server';
import Link from 'next/link';

export default function BlogPage() {
  const posts = [...blog].toSorted((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className='mx-auto max-w-4xl px-6 py-12'>
      <h1 className='text-4xl font-bold tracking-tight'>Blog</h1>
      <p className='text-fd-muted-foreground mt-4 text-lg'>
        The latest news and technical articles from the DayFlow team.
      </p>
      <div className='mt-10 space-y-12'>
        {posts.map(post => {
          const slug = post.info.path.replace(/\.mdx$/, '');
          const url = `/blog/${slug}`;
          return (
            <article
              key={url}
              className='flex flex-col items-start justify-between'
            >
              <div className='flex items-center gap-x-4 text-xs'>
                {post.date && (
                  <time
                    dateTime={post.date}
                    className='text-fd-muted-foreground'
                  >
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
              </div>
              <div className='group relative'>
                <h3 className='group-hover:text-fd-primary mt-3 text-2xl leading-6 font-semibold transition-colors'>
                  <Link href={url}>
                    <span className='absolute inset-0' />
                    {post.title}
                  </Link>
                </h3>
                {post.description && (
                  <p className='text-fd-muted-foreground mt-5 line-clamp-3 text-sm leading-6'>
                    {post.description}
                  </p>
                )}
              </div>
              <div className='mt-6'>
                <Link
                  href={url}
                  className='text-fd-primary text-sm font-medium transition-opacity hover:opacity-80'
                >
                  Read more →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
