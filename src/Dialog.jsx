/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from 'react';
import { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import './Dialog.css';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let stop = false;
function Dialog({ parseResult } = {}, ref) {
  const [samples, setSamples] = useState(1000);
  const [fileName, setFileName] = useState('customEasing');

  const el = useRef();

  const clickOutside = useCallback(e => {
    const { x, y, width, height } = el.current.getBoundingClientRect();
    const isClickInside = e.clientX >= x && e.clientX <= x + width && e.clientY <= y + height && e.clientY >= y;
    if (!isClickInside) closeMethod();
  }, []);

  const showMethod = async () => {
    el.current.showModal();
    await sleep(230);
    document.addEventListener('click', clickOutside);
  };

  async function closeMethod() {
    el.current.classList.add('hide');

    document.removeEventListener('click', clickOutside);

    await sleep(230);

    el.current.classList.remove('hide');
    el.current.close();
  }

  useImperativeHandle(ref, () => ({ show: showMethod }));

  useEffect(() => {
    return () => document.removeEventListener('click', clickOutside);
  }, []);

  const generateClick = e => {
    // check for valid variable name input.
    if (fileName.trim() !== fileName) return alert('File name must not contain spaces');
    try {
      // eslint-disable-next-line no-new-func
      new Function(fileName, 'var ' + fileName);
    } catch (_) {
      return alert('File name must be a valid javascript variable name');
    }

    const progressInner = document.querySelector('#progress div');
    const progressText = document.querySelector('#progressText');

    // Cancel button
    if (e.target.innerHTML === 'Cancel') {
      stop = true;
      e.target.innerHTML = 'Generate';
      e.target.style.removeProperty('background-color');
      progressInner.style.width = '0%';
      progressText.innerHTML = '0%';
      closeMethod();
      return;
    }

    stop = false;

    e.target.innerHTML = 'Cancel';
    e.target.style.backgroundColor = '#ff0000';

    const onUpdate = percent => {
      progressInner.style.width = `${percent * 100}%`;
      progressText.innerHTML = `${Math.floor(percent * 100)}%`;
      // on finish
      if (percent === 1) {
        e.target.style.removeProperty('background-color');
        e.target.innerHTML = 'Generate';
        closeMethod();
      }
    };

    generate(parseResult(), samples, fileName, onUpdate);
  };

  return (
    <dialog ref={el} id={'container'}>
      <p id='message'>Export your easing function to file</p>

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
        <p>File Name : </p>
        <input className='inputs' placeholder='CustomEasing' value={fileName} onChange={e => setFileName(e.target.value)} />
      </div>

      <div id='progress'>
        <div />
      </div>

      <p id='progressText'>0%</p>

      <button className='okButtons' onClick={generateClick}>
        Generate
      </button>
    </dialog>
  );
}

export default forwardRef(Dialog);

async function generate(d, samples = 1000, fileName = 'CustomEasing', onUpdate) {
  const values = new Float32Array(samples);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  const pathLength = path.getTotalLength();

  let percent = 0;
  for (let i = 0; i < samples; i++) {
    if (stop) return;

    percent = (i + 1) / samples;
    onUpdate(percent);
    const point = (i + 1) / samples;

    let start = 0,
      end = pathLength,
      target = (start + end) / 2,
      result = point,
      times = 0;

    while (target >= start && target <= pathLength) {
      if (stop) return;
      await new Promise(resolve => setTimeout(resolve, 1));

      const pos = path.getPointAtLength(target);
      times++;

      if (times > 50) {
        console.warn('something went wrong');
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

    values[i] = result;
  }

  // download as js file
  const string = `const ${fileName} = Float32Array.from(${JSON.stringify([...values])});\nexport default ${fileName};`,
    // const string = `export default Float32Array.from(${JSON.stringify([...values])})`,
    blob = new Blob([string], { type: 'text/plain' }),
    url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = fileName + '.js';
  link.click();
  URL.revokeObjectURL(url);
  console.log(string);
}
