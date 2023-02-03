import './DownloadFile.css';
import React, { useState } from 'react';

import { Bezier, parsePath } from '../Helpers/Helpers';

let stop = false;

type propsT = {
  parseResult: (p?: number[][]) => string;
  closeDialog: () => void;
};

export default function DownloadFile({ parseResult, closeDialog }: propsT, ref: React.Ref<{ show: () => Promise<void> }>) {
  const [samples, setSamples] = useState(1000);
  const [fileName, setFileName] = useState('customEasing');

  const generateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
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
      stop = true;
      target.innerHTML = 'Generate';
      target.style.removeProperty('background-color');
      progressInner.style.width = '0%';
      progressText.innerHTML = '0%';
      closeDialog();
      return;
    }

    stop = false;

    target.innerHTML = 'Cancel';
    target.style.backgroundColor = '#ff0000';

    const onUpdate = (percent: number) => {
      progressInner.style.width = `${percent * 100}%`;
      progressText.innerHTML = `${Math.floor(percent * 100)}%`;
      // on finish
      if (percent === 1) {
        target.style.removeProperty('background-color');
        target.innerHTML = 'Generate';
        closeDialog();
      }
    };

    generate(parseResult(), samples, fileName, onUpdate);
  };

  return (
    <div>
      <p id='message'>Export your easing function to a js file.</p>

      <div className='inputsContainer'>
        <p>Samples : </p>
        <input
          type='number'
          className='inputs'
          placeholder='samples'
          value={samples}
          onChange={e => setSamples(+e.target.value)}
        />
      </div>

      <div className='inputsContainer'>
        <p>Name : </p>
        <input className='inputs' placeholder='CustomEasing' value={fileName} onChange={e => setFileName(e.target.value)} />
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

async function generate(d: string, samples = 1000, fileName = 'CustomEasing', onUpdate: (i: number) => void) {
  console.time('✅ Done in:');

  const points = parsePath(d);
  const values = new Float32Array(samples);
  let count = 0;
  let percent = 0;

  for (let e = 0; e < points.length; e++) {
    const { p0, c0, c1, p1 } = points[e];

    if (stop) return;
    percent = (e + 1) / points.length;
    onUpdate(percent);

    await new Promise(resolve => setTimeout(resolve, 10)); // for faste calculations.

    for (let i = 0; i < samples; i++) {
      if (stop) return;

      const point = i / samples;
      const dist = (p1.x - 0) * samples;

      let start = 0,
        end = 1,
        target = (start + end) / 2,
        times = 0,
        result: number | null = 0;

      while (target >= start && target <= 1) {
        if (stop) return;

        const pos = Bezier(p0, c0, c1, p1, target);

        times++;

        if (times > 50) {
          result = null;
          break;
        }

        if (Math.abs(pos.x - point) <= 0.001) {
          result = pos.y;
          break;
        }

        if (pos.x >= point) end = target;
        else start = target;

        target = (start + end) / 2;
      }

      if (result !== null && count <= dist) {
        values[count] = result;
        count++;
      }
    }
  }

  values[0] = points[0].p0.y;
  values[samples - 1] = points[points.length - 1].p1.y;

  console.timeEnd('✅ Done in:');

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
}


