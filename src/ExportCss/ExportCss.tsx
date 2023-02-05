/* eslint-disable react-hooks/exhaustive-deps */
import './ExportCss.css';
import React, { useContext, useEffect, useState } from 'react';
import CTX from '../Helpers/CTX';
import { getYpoints, parsePath } from '../Helpers/Helpers';

export default function ExportCss() {
  const ctx = useContext(CTX);

  const [property, setProperty] = useState('transform: translateX({value}%)');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(100);
  const [accuracy, setAccuracy] = useState(50);

  const [update, setUpdate] = useState(0);
  const [isSimple, setIsSimple] = useState(false);

  const generate = async () => {
    const path = ctx.parseResult();
    const curves = parsePath(path);

    let resutls = '';

    if (curves.length === 1) {
      resutls = `.element {\n  transition: transform 0.6s cubic-bezier(${curves[0].c0.x}, ${curves[0].c0.y}, ${curves[0].c1.x}, ${curves[0].c1.y});\n}`;
      return resutls;
    }

    const points = await getYpoints(path, 500);
    const length = points.length;
    const increaseBy = Math.round(100 / accuracy);

    let lastPoint = null;
    for (let i = 0; i <= 100; i += increaseBy) {
      const x = i / 100;
      const y = points[Math.floor(x * length)] ?? points[length - 1];
      const value = +(from + (to - from) * y).toFixed(2);
      if (lastPoint === value) continue;
      lastPoint = value;

      resutls += `  ${i}% { ${property.replaceAll('{value}', value.toString())}; }\n`;
    }

    resutls = `@keyframes my-custom-easing {\n${resutls}}`;

    return resutls;
  };

  const preElemtent = async () => {
    const pre = document.querySelector<HTMLPreElement>('.css-pre');
    if (!pre) return;
    const string = await generate();

    setIsSimple(string.startsWith('.element'));

    pre.innerHTML = string
      .replace('@keyframes', '<span class="token">$&</span>')
      .replace('cubic-bezier', '<span class="token">$&</span>')
      .replace(/^\.element/, '<span class="token">$&</span>')
      .replace(/(\d+%)(\s{)/g, '<span class="token">$1</span> {')
      .replace(/(\()(.+)(\))/g, '(<span class="value">$2</span>)')
      .replace('my-custom-easing', '<span class="name">$&</span>')
      .replace(/{|}/g, '<strong class="curly-brackets">$&</strong>')
      .replace(/:|,|;/g, '<strong class="colon">$&</strong>')
      .replace(/\(|\)/g, '<strong class="parentheses ">$&</strong>');
  };

  const copyHandle = async () => {
    const string = await generate();
    navigator.clipboard.writeText(string);
  };

  useEffect(() => {
    preElemtent();
  }, [update, from, to, property, accuracy]);

  useEffect(() => {
    const dialog = document.getElementById('css-dialog')?.parentNode as HTMLDialogElement;
    const onShow = () => {
      setUpdate(Math.random());
    };

    dialog.addEventListener('animationstart', onShow);

    return () => {
      dialog.removeEventListener('animationstart', onShow);
    };
  }, []);

  return (
    <div id='css-dialog'>
      <h2 className='css-dialog-title'>Export As CSS</h2>

      {!isSimple && (
        <>
          <div className='css-input-container'>
            <p>Property</p>
            <input
              value={property}
              title='Ensure the use of `{value}` as the animated value variable'
              type='text'
              onChange={e => setProperty(e.target.value)}
            />
          </div>

          <div className='css-input-container'>
            <p>Accuracy</p>
            <input
              value={accuracy}
              type='number'
              title='A number between 1 and 100'
              onChange={e => {
                const value = isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber;
                setAccuracy(value < 1 ? 1 : value > 100 ? 100 : value);
              }}
            />
          </div>

          <div className='css-input-container'>
            <p>From</p>
            <input
              value={from}
              title='Animate starting from this value'
              type='number'
              onChange={e => setFrom(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
            />
          </div>

          <div className='css-input-container'>
            <p>To</p>
            <input
              value={to}
              title='End animation at this value'
              type='number'
              onChange={e => setTo(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
            />
          </div>
        </>
      )}

      <div className='pre-container'>
        <pre className='css-pre' />
        <button className='copy-button' onClick={copyHandle}>
          Copy
        </button>
      </div>

      <button className='closeButton' onClick={() => ctx.toggleExportDialog('CSS')}>
        Close
      </button>
    </div>
  );
}
