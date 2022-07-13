import { CleanCSS, Page, path, type Site } from './deps.ts';

interface Options {
	/**
	 * @default ['.css']
	 */
	extensions?: string[];
	/**
	 * @default
	 * {
	 *  level: 2,
	 *  sourceMap: true,
	 *  sourceMapInlineSources: true,
	 * }
	 */
	options?: Omit<
		CleanCSS.OptionsPromise,
		'returnPromise' | 'rebase' | 'rebaseTo'
	>;
}

const cleanCssPlugin = (options: Options = {}) => {
	const extensions = options.extensions ?? ['.css'];

	const cleaner = new CleanCSS({
		level: 2,
		sourceMap: true,
		sourceMapInlineSources: true,
		...options.options,
		returnPromise: true,
		rebase: false,
	});

	return (site: Site) => {
		site.loadAssets(extensions);
		site.process(extensions, async (file) => {
			let map = site.pages.find((page) => (
				page.dest.path + page.dest.ext ===
					file.dest.path + file.dest.ext + '.map'
			));

			// Temporarily remove the sourceMap comment. We already have the
			// sourceMap, and CleanCSS can't read the file anyways, so it's
			// just annoying.
			const css = (file.content as string).replace(
				/\/\*#\s*sourceMappingURL=.+$/,
				'',
			);

			const output = await cleaner.minify(
				css,
				map ? map.content as string : undefined,
			);

			for (const error of output.errors) {
				site.logger.warn(error, {
					name: 'CleanCSS (error)',
				});
			}

			for (const warn of output.warnings) {
				site.logger.warn(warn, {
					name: 'CleanCSS (warning)',
				});
			}

			if (output.sourceMap) {
				if (!map) {
					map = Page.create(file.dest.path + file.dest.ext + '.map', '');
					site.pages.push(map);
				}

				file.content = output.styles +
					`\n/*# sourceMappingURL=${
						path.basename(map.dest.path + map.dest.ext)
					} */`;

				map.content = output.sourceMap.toString();
			} else {
				file.content = output.styles;
			}
		});
	};
};

export type cleanCssOptions = Options;
export default cleanCssPlugin;
