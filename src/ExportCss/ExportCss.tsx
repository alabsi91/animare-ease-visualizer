import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/rainbow.css';
import { useEffect, useState } from 'react';
import './ExportCss.css';

import { useApp } from '../Helpers/AppContext';
import { preparePointsForAnimation } from '../Helpers/utils';
import HighlightInput from '../components/HighlightInput/HighlightInput';
import { generateEasingFunctionFromArray } from '../Helpers/geometry';

hljs.registerLanguage('css', css);

export default function ExportCss() {
  const ctx = useApp();

  const [property, setProperty] = useState('transform: translateX({value}%);');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(100);

  const [isSimple, setIsSimple] = useState(false);

  const generate = async () => {
    const viewBox = {
      x: ctx.zoom.current,
      y: ctx.zoom.current,
      width: ctx.viewBoxSize.current,
      height: ctx.viewBoxSize.current,
    };
    const curves = preparePointsForAnimation(ctx.points, viewBox);

    let results = '';

    if (curves.length === 1) {
      results = `.element {\n  transition: transform 0.6s cubic-bezier(${curves[0][2]}, ${curves[0][3]}, ${curves[0][4]}, ${curves[0][5]});\n}`;
      return results;
    }

    const easingFunction = generateEasingFunctionFromArray(curves);

    for (let i = 0; i <= 100; i++) {
      const progress = i / 100;
      const value = +(from + (to - from) * easingFunction(progress)).toFixed(2);
      results += `  ${i}% { ${property.replaceAll('{value}', value.toString())} }\n`;
    }

    results = `@keyframes my-custom-easing {\n${results}}`;

    return results;
  };

  const highlight = async () => {
    const pre = document.querySelector<HTMLPreElement>('.css-dialog-pre');
    if (!pre) return;

    const string = await generate();

    setIsSimple(string.startsWith('.element'));

    pre.innerHTML = hljs.highlight(string, { language: 'css' }).value;
  };

  const copyHandle = async () => {
    const string = await generate();
    navigator.clipboard.writeText(string);
  };

  useEffect(() => {
    highlight();
  }, [from, to, property]);

  return (
    <div id='css-dialog'>
      <h2 className='css-dialog-title'>Export as CSS</h2>

      {!isSimple && (
        <>
          <div className='css-input-container'>
            <p>Property</p>

            <HighlightInput
              value={property}
              title='Ensure the use of `{value}` as the animated value variable'
              type='text'
              spellCheck={false}
              onChange={e => setProperty(e.target.value)}
              plugin={input =>
                hljs
                  .highlight(input, { language: 'css' })
                  .value.replaceAll(
                    '{value}',
                    '<span class="hljs-built_in">{</span><span class="hljs-number">value</span><span class="hljs-built_in">}</span>'
                  )
              }
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
        <pre className='css-dialog-pre custom-scrollbar' />
        <button className='css-dialog-copy-button' onClick={copyHandle}>
          Copy
        </button>
      </div>

      <button className='css-dialog-close-button' onClick={() => ctx.toggleExportDialog('CSS')}>
        Close
      </button>
    </div>
  );
}
