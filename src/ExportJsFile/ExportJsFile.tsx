import './ExportJsFile.css';
import React, { useContext, useEffect, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';

import { getYpoints } from '../Helpers/Helpers';
import CTX from '../Helpers/CTX';

hljs.registerLanguage('javascript', javascript);

let controller = new AbortController();

export default function ExportJsFile() {
  const ctx = useContext(CTX);

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
      values = await getYpoints(ctx.parseResult(), samples, onUpdate, controller.signal);
    } catch (error) {
      console.log('error :', error);
      return;
    }

    // download as js file
    const string = `const values = Float32Array.from(${JSON.stringify([
        ...values,
      ])});\nconst length = values.length;\nconst ${fileName} = (t) => values[Math.floor(t * length)] ?? values[length - 1];\nexport default ${fileName};`,
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

    const string = `import ${fileName} from './${fileName}';

// animare
animare({
  // ...
  ease: ${fileName} // 👈
});

// Anime.js
anime({
  // ...
  easing: ${fileName} // 👈
});

// GreenSock JS
gsap.to(element, {
  // ...
  ease: ${fileName} // 👈
});

// Mo.js
new mojs.Tween({
   // ...
  easing: ${fileName} // 👈
});

// Vivus.js
new Vivus(
  element,
  {
   // ...
    animTimingFunction: ${fileName} // 👈
  },
  myCallback
);
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
