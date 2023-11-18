import fsExtra from 'fs-extra';
import { glob } from 'glob';
import * as path from 'node:path';

import { writeIfChanged } from '../utils/validations';
import type { Config } from '../cli';
import { defaultConfig } from '../utils/config';


const command = 'yarn workspace web run gen:illustrations:types';
const generatedByText = `This file is generated by ${command}. Don't edit it manually.`;

async function generateTypes(files: Array<string>, typeDir: string) {
	const typeOutputFilepath = path.join(typeDir, 'illustration-path.d.ts');
	const currentTypes = await fsExtra.readFile(typeOutputFilepath, 'utf8').catch(() => '');

	const typesUpToDate = files.every((path) => currentTypes.includes(`"${path}"`));

	if (typesUpToDate) {
		console.log(`Icons are up to date`);

		return;
	}

	for (const file of files) {
		console.log('✅', file);
	}

	const stringifiedIconNames = files.map((path) => JSON.stringify(`/illustrations/${path}`));

	const typeOutputContent = `// ${generatedByText}

export type IllustrationPath =
\t| ${stringifiedIconNames.join('\n\t| ').replace(/"/g, "'")};
`;
	const typesChanged = await writeIfChanged(typeOutputFilepath, typeOutputContent);

	console.log(`Manifest saved to ${path.relative(process.cwd(), typeOutputFilepath)}`);

	if (typesChanged) {
		console.log(`Generated ${files.length} icons`);
	}
}

export async function generateIllustrationTypes(config: Config) {
    const { outDir = defaultConfig.outDir, illustrations } = config;
    const { inputDir } = illustrations;
    
    const cwd = process.cwd();

    const inputDirRelative = path.relative(cwd, inputDir);
    const typeDirRelative = path.join(cwd, outDir, 'types');

    await fsExtra.ensureDir(typeDirRelative);

    const files = glob
        .sync('**/*.{svg,png,jpg,jpeg}', {
            cwd: inputDir,
        })
        .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
        console.log(`No SVG files found in ${inputDirRelative}`);
    } else {
        await generateTypes(files, typeDirRelative);
    }
}