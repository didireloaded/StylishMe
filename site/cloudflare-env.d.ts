/* Cloudflare runtime globals supplied by the Sites deployment environment. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Fetcher = any;
type D1Database = any;
type R2Bucket = any;

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    MEDIA: R2Bucket;
  };
}
