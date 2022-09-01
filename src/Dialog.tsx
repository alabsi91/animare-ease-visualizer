/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from 'react';
import { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import './Dialog.css';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let stop = false;

type propsT = {
  parseResult: (p?: number[][]) => string;
};

function Dialog({ parseResult }: propsT, ref: React.Ref<{ show: () => Promise<void> }>) {
  const [samples, setSamples] = useState(1000);
  const [fileName, setFileName] = useState('customEasing');

  const el = useRef<HTMLDialogElement>(null);

  const clickOutside = useCallback((e: MouseEvent) => {
    if (!el.current) return;
    const { x, y, width, height } = el.current.getBoundingClientRect();
    const isClickInside = e.clientX >= x && e.clientX <= x + width && e.clientY <= y + height && e.clientY >= y;
    if (!isClickInside) closeMethod();
  }, []);

  const showMethod = async () => {
    if (!el.current) return;
    el.current.showModal();
    await sleep(230);
    document.addEventListener('click', clickOutside);
  };

  async function closeMethod() {
    if (!el.current) return;
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
      closeMethod();
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
        closeMethod();
      }
    };

    generate(parseResult(), samples, fileName, onUpdate);
  };

  return (
    <dialog ref={el} id={'container'}>
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
    </dialog>
  );
}

export default forwardRef<{ show: () => Promise<void> }, propsT>(Dialog);

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
  // link.click();
  URL.revokeObjectURL(url);
}

type Point = { x: number; y: number };
type S_Point = { c1: Point; p1: Point };
type C_Point = { p0: Point; c0: Point; c1: Point; p1: Point };

export function Bezier(p0: Point, c0: Point, c1: Point, p1: Point, t: number) {
  const point = { x: 0, y: 0 },
    mt = 1 - t,
    mt2 = mt * mt,
    mt3 = mt2 * mt;

  point.x = p0.x * mt3 + c0.x * 3 * mt2 * t + c1.x * 3 * mt * t * t + p1.x * t ** 3;
  point.y = p0.y * mt3 + c0.y * 3 * mt2 * t + c1.y * 3 * mt * t * t + p1.y * t ** 3;

  return point;
}

export function parsePath(path: string) {
  const reg_s = /S[\s|,]?(?<c1x>-?\d\.?\d*)[\s|,](?<c1y>-?\d\.?\d*)[\s|,](?<p1x>-?\d\.?\d*)[\s|,](?<p1y>-?\d\.?\d*)/g;
  const reg_c =
    /M[\s|,]?((?<p0x>-?\d\.?\d*)[\s|,](?<p0y>-?\d\.?\d*))[\s|,]C[\s|,|-]?(?<c0x>-?\d\.?\d*)[\s|,](?<c0y>-?\d\.?\d*)[\s|,](?<c1x>-?\d\.?\d*)[\s|,](?<c1y>-?\d\.?\d*)[\s|,](?<p1x>-?\d\.?\d*)[\s|,](?<p1y>-?\d\.?\d*)/;

  // check if the path string is valid
  if (!reg_c.test(path) || (path.includes('S') && !reg_s.test(path))) throw new Error('path is not valid');

  reg_s.lastIndex = 0;
  reg_c.lastIndex = 0;

  const s_curves = [...path.matchAll(reg_s)].map(e =>
    e.groups ? { c1: { x: +e.groups.c1x, y: +e.groups.c1y }, p1: { x: +e.groups.p1x, y: +e.groups.p1y } } : e
  ) as S_Point[];

  // get first point c curve.
  const c_curve_match = reg_c.exec(path)?.groups;
  if (!c_curve_match) throw new Error('path is not valid');
  const c_curve: C_Point = {
    p0: { x: +c_curve_match.p0x, y: +c_curve_match.p0y },
    c0: { x: +c_curve_match.c0x, y: +c_curve_match.c0y },
    c1: { x: +c_curve_match.c1x, y: +c_curve_match.c1y },
    p1: { x: +c_curve_match.p1x, y: +c_curve_match.p1y },
  };

  const results: [C_Point, ...S_Point[]] = [c_curve, ...s_curves];

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    results[i] = {
      p0: prev.p1,
      c0: { x: (prev.p1.x - prev.c1.x) * 2 + prev.c1.x, y: (prev.p1.y - prev.c1.y) * 2 + prev.c1.y },
      c1: results[i].c1,
      p1: results[i].p1,
    };
  }

  return results as C_Point[];
}
