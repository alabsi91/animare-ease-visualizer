import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import React, { useEffect, useState } from 'react';
import './ExportJsFile.css';

import { useApp } from '../utils/AppContext';
import { convertEasingFunctionToPoints } from '../utils/utils';
import { preparePointsForAnimation } from '../utils/utils';

hljs.registerLanguage('javascript', javascript);

let controller = new AbortController();

export default function ExportJsFile() {
  const ctx = useApp();

  const [samples, setSamples] = useState(1000);
  const [fileName, setFileName] = useState('customEasing');

  const generateClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLButtonElement;
    // check for valid variable name input.
    if (fileName.trim() !== fileName) return alert('File name must not contain spaces');
    try {
      // eslint-disable-next-line no-new-func
      new Function(fileName, 'var ' + fileName);
    } catch (_) {
      return alert('File name must be a valid javascript variable name');
    }

    const progressInner = document.querySelector('#progress div') as HTMLDivElement;
    const progressText = document.querySelector('#progressText') as HTMLParagraphElement;

    // Cancel button
    if (target.innerHTML === 'Cancel') {
      controller.abort();
      target.innerHTML = 'Generate';
      target.style.removeProperty('background-color');
      progressInner.style.width = '0%';
      progressText.innerHTML = '0%';
      ctx.toggleExportDialog('JS File');
      return;
    }

    controller = new AbortController();

    target.innerHTML = 'Cancel';
    target.style.backgroundColor = '#ff0000';

    const onUpdate = (percent: number) => {
      progressInner.style.width = `${percent * 100}%`;
      progressText.innerHTML = `${Math.floor(percent * 100)}%`;
      // on finish
      if (percent === 1) {
        progressInner.style.width = '0%';
        progressText.innerHTML = '0%';
        target.style.removeProperty('background-color');
        target.innerHTML = 'Generate';
        ctx.toggleExportDialog('JS File');
      }
    };

    let values: Float32Array;
    try {
      const viewBox = {
        x: ctx.zoom.current,
        y: ctx.zoom.current,
        width: ctx.viewBoxSize.current,
        height: ctx.viewBoxSize.current,
      };
      const curves = preparePointsForAnimation(ctx.points, viewBox);

      values = await convertEasingFunctionToPoints(curves, samples, onUpdate, controller.signal);
    } catch (error) {
      console.log('error :', error);
      return;
    }

    // download as js file
    const string = `const values = ${JSON.stringify([
        ...values,
      ])};\nconst length = values.length;\nconst ${fileName} = t => {\n  'worklet';\n  return values[Math.floor(t * length)] ?? values[length - 1];\n}\nexport default ${fileName};`,
      blob = new Blob([string], { type: 'text/plain' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = fileName + '.js';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const pre = document.querySelector<HTMLPreElement>('.download-dialog-pre');
    if (!pre) return;

    const string = `// How to use ❔
import animare from 'animare';
import ${fileName} from './${fileName}';

animare.single({
  // ...options
  ease: ${fileName} // 👈
}, callback);
`;

    pre.innerHTML = hljs.highlight(string, { language: 'javascript' }).value;
  }, [fileName]);

  return (
    <div>
      <h3 className='download-dialog-title'>Exporting to a JavaScript File</h3>
      <p className='download-dialog-description'>Will be stored as an Array of numbers as points</p>

      <div className='pre-container'>
        <pre className='download-dialog-pre custom-scrollbar' />
      </div>

      <div className='inputsContainer'>
        <p>Samples</p>
        <input type='number' placeholder='samples' value={samples} onChange={e => setSamples(+e.target.value)} />
      </div>

      <div className='inputsContainer'>
        <p>Name</p>
        <input placeholder='CustomEasing' value={fileName} onChange={e => setFileName(e.target.value)} spellCheck={false} />
      </div>

      <div id='progress'>
        <div />
      </div>

      <p id='progressText'>0%</p>

      <button className='okButtons' onClick={generateClick}>
        Generate
      </button>
    </div>
  );
}
