declare global {
  /** Whether `webp` is enabled */
  const _webp: boolean;

  /** If `webp` is enabled it will be `'.webp'` else `'.png'` */
  const _webp_png: ".webp" | ".png";

  /** If `webp` is enabled it will be `'.webp'` else `'.png'` */
  const _webp_jpg: ".webp" | ".jpg";

  /** If `webp` is enabled it will be `'.webp'` else `'.jpeg'` */
  const _webp_jpeg: ".webp" | ".jpeg";

  /** Whether the app is in production mode */
  const _production: boolean;

  /**
   * - Import a file and inline it as a string at build time.
   *
   * @param filePath - The path to the file
   * @param options - Optional options
   * @param options.templateLiteral - Whether to wrap the string in a template literal
   * @param options.minify - Whether to minify the string in case of the file is a html/css file.
   */
  function import_as_string(
    filePath: string,
    options?: {
      /** - Whether to wrap the string in a template literal */
      templateLiteral?: boolean;
      /** - Whether to minify the string in case of the file is a html/css file. */
      minify?: boolean;
    }
  ): string;
}

export {};
