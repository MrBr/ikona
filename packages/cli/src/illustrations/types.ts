import fsExtra from 'fs-extra';
import { glob } from 'glob';
import * as path from 'node:path';

import { writeIfChanged } from '../utils/validations';
import type { Config } from '../cli';
import { defaultConfig } from '../utils/config';

interface GenerateIconFilesOptions {
  files: Array<string>;
  typeDir: string;
  outputDir: string;
  force?: boolean;
}

async function generateTypes({
  files,
  typeDir,
  outputDir,
  force,
}: GenerateIconFilesOptions) {
  const typeOutputFilepath = path.join(typeDir, 'illustration-path.d.ts');
  const currentTypes = await fsExtra
    .readFile(typeOutputFilepath, 'utf8')
    .catch(() => '');

  const typesUpToDate = files.every((path) =>
    currentTypes.includes(`"${path}"`)
  );

  if (typesUpToDate) {
    console.log('Illustrations are up to date');

    return;
  }

  const stringifiedIconNames = files.map((path) =>
    JSON.stringify(`/illustrations/${path}`)
  );
  const typeOutputContent = `export type IllustrationPath =
\t| ${stringifiedIconNames.join('\n\t| ').replace(/"/g, "'")};
`;
  const typesChanged = await writeIfChanged({
    filepath: typeOutputFilepath,
    newContent: typeOutputContent,
    force,
  });

  if (typesChanged) {
    for (const file of files) {
      console.log('✅', file);
    }

    console.log(
      `Types saved to ${path.relative(process.cwd(), typeOutputFilepath)}`
    );
  }

  /** Export illustration paths */
  const illustrationsOutputFilepath = path.join(outputDir, 'illustrations.ts');
  const illustrationsOutputContent = `import { IllustrationPath } from './types/illustration-path';

export const illustrations = [
\t${stringifiedIconNames.join(',\n\t')},
] satisfies Array<IllustrationPath>;
`;
  const illustrationsChanged = await writeIfChanged({
    filepath: illustrationsOutputFilepath,
    newContent: illustrationsOutputContent,
    force,
  });

  if (illustrationsChanged) {
    console.log(
      `Illustrations saved to ${path.relative(
        process.cwd(),
        illustrationsOutputFilepath
      )}`
    );
  }

  if (typesChanged || illustrationsChanged) {
    console.log(`Generated ${files.length} icons`);
  } else {
    console.log(`Illustrations are up to date`);
  }
}

export async function generateIllustrationTypes(config: Config) {
  const { outputDir = defaultConfig.outputDir, illustrations } = config;
  const { inputDir } = illustrations;

  const cwd = process.cwd();

  const inputDirRelative = path.relative(cwd, inputDir);
  const outputDirRelative = path.join(cwd, outputDir);
  const typeDirRelative = path.join(cwd, outputDir, 'types');

  await Promise.all([
    fsExtra.ensureDir(inputDirRelative),
    fsExtra.ensureDir(outputDirRelative),
    fsExtra.ensureDir(typeDirRelative),
  ]);

  const files = glob
    .sync('**/*.{svg,png,jpg,jpeg}', {
      cwd: inputDir,
    })
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log(`No SVG files found in ${inputDirRelative}`);
  } else {
    await generateTypes({
      files,
      typeDir: typeDirRelative,
      outputDir: outputDirRelative,
      force: config.force,
    });
  }
}
