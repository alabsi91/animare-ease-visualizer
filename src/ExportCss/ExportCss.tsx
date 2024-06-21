import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/rainbow.css';
import { useEffect, useState } from 'react';
import './ExportCss.css';

import Dialog from '../components/Dialog/Dialog';
import HighlightInput from '../components/HighlightInput/HighlightInput';
import { useApp } from '../utils/AppContext';
import { generateEasingFunctionFromArray } from '../utils/geometry';
import { formatCode, preparePointsForAnimation } from '../utils/utils';

hljs.registerLanguage('css', css);

export default function ExportCss() {
  const ctx = useApp();

  const [property, setProperty] = useState('transform: translateX({value}%);');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(100);
  const [accuracy, setAccuracy] = useState(100);

  const [isOneCubicBezier, setIsOneCubicBezier] = useState(false);

  const generate = () => {
    const viewBox = {
      x: ctx.zoom.current,
      y: ctx.zoom.current,
      width: ctx.viewBoxSize.current,
      height: ctx.viewBoxSize.current,
    };
    const curves = preparePointsForAnimation(ctx.points, viewBox);

    let results = '';

    if (curves.length === 1) {
      results = `.element{transition:transform 0.6s cubic-bezier(${+curves[0][2].toFixed(3)},${+curves[0][3].toFixed(
        3,
      )},${+curves[0][4].toFixed(3)},${+curves[0][5].toFixed(3)});}`;
      return results;
    }

    const easingFunction = generateEasingFunctionFromArray(curves);
    const increaseBy = Math.round(100 / accuracy);

    for (let i = 0; i < 100; i += increaseBy) {
      const progress = i / 100;
      const value = +(from + (to - from) * easingFunction(progress)).toFixed(2);
      results += `${i}%{${property.replaceAll('{value}', value.toString())}}`;
    }

    const lastValue = +(from + (to - from) * easingFunction(1)).toFixed(2);
    results += `${100}%{${property.replaceAll('{value}', lastValue.toString())}}`;

    results = `@keyframes my-custom-easing{${results}}`;

    return results;
  };

  const highlight = async () => {
    const pre = document.querySelector<HTMLPreElement>('.css-dialog-pre');
    if (!pre) return;

    const code = generate();
    const formatted = await formatCode(code);

    setIsOneCubicBezier(code.startsWith('.element'));

    pre.innerHTML = hljs.highlight(formatted, { language: 'css' }).value;
  };

  const copyHandle = () => {
    const string = generate();
    formatCode(string).then(formatted => {
      navigator.clipboard.writeText(formatted);
    });
  };

  useEffect(() => {
    highlight();
  }, [from, to, property, accuracy]);

  return (
    <div id='css-dialog'>
      <h2 className='css-dialog-title'>Export as CSS Keyframe</h2>

      {!isOneCubicBezier && (
        <>
          <div className='css-input-container' title='Ensure the use of `{value}` as the animated value variable'>
            <p>Property</p>

            <HighlightInput
              value={property}
              type='text'
              spellCheck={false}
              onChange={e => setProperty(e.target.value)}
              plugin={input =>
                hljs
                  .highlight(input, { language: 'css' })
                  .value.replaceAll(
                    '{value}',
                    '<span class="hljs-built_in">{</span><span class="hljs-number">value</span><span class="hljs-built_in">}</span>',
                  )
              }
            />
          </div>

          <div className='css-input-container' title='A number between 1 and 100'>
            <p>Accuracy</p>
            <input
              value={accuracy}
              type='number'
              onChange={e => {
                const value = isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber;
                setAccuracy(value < 1 ? 1 : value > 100 ? 100 : value);
              }}
            />
          </div>

          <div className='css-input-container' title='Animate starting from this value'>
            <p>From</p>
            <input
              value={from}
              type='number'
              onChange={e => setFrom(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
            />
          </div>

          <div className='css-input-container' title='End animation at this value'>
            <p>To</p>
            <input value={to} type='number' onChange={e => setTo(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)} />
          </div>
        </>
      )}

      {isOneCubicBezier && (
        <div className='warning'>
          The current path uses a single curve, which can be represented with the CSS <strong>cubic-bezier()</strong> function.
          Consider using multiple curves to generate the result as a keyframe animation.
        </div>
      )}

      <div className='pre-container'>
        <pre className='css-dialog-pre custom-scrollbar' />
        <button className='css-dialog-copy-button' onClick={copyHandle}>
          Copy
        </button>
      </div>

      <button className='css-dialog-close-button' onClick={() => Dialog.$exportCssKeyframe?.toggle()}>
        Close
      </button>
    </div>
  );
}
