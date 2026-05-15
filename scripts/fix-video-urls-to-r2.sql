-- Replace local /videos/ paths with Cloudflare R2 public URLs
-- Run via: docker exec -i bigboss-postgres psql -U bigboss -d bigbossfitness < fix-video-urls-to-r2.sql

UPDATE exercises SET
  video_demo_url = REPLACE(video_demo_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  video_form_url = REPLACE(video_form_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  video_mistakes_url = REPLACE(video_mistakes_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  video_tips_url = REPLACE(video_tips_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  thumbnail_url = REPLACE(thumbnail_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  gif_preview_url = REPLACE(gif_preview_url, '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/');

UPDATE "Recipes" SET
  "PhotoUrl" = REPLACE("PhotoUrl", '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/'),
  "VideoUrl" = REPLACE("VideoUrl", '/videos/', 'https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/');
