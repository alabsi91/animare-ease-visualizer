import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { useEffect, useRef, useState } from 'react';
import './ExportCssLinear.css';

import { useApp } from '../utils/AppContext';
import { convertEasingFunctionToPoints, formatCode, preparePointsForAnimation } from '../utils/utils';

hljs.registerLanguage('javascript', javascript);

let controller = new AbortController();

export default function ExportCssLinear() {
  const ctx = useApp();

  const [samples, setSamples] = useState(50);
  const [cssVarName, setCssVarName] = useState('--custom-easing');
  const [isOneCubicBezier, setIsOneCubicBezier] = useState(false);

  const values = useRef([0, 1]);
  const isGenerating = useRef(false);

  const generateCode = async () => {
    const pre = document.querySelector<HTMLPreElement>('.download-dialog-pre');
    if (!pre) return;

    const code = isOneCubicBezier
      ? `:root{${cssVarName}:cubic-bezier(${values.current.join(',')});}`
      : `:root{${cssVarName}:linear(${values.current.join(',')});}`;

    const formatted = await formatCode(code);
    pre.innerHTML = hljs.highlight(formatted, { language: 'css' }).value;
  };

  const generateClick = async () => {
    const target = document.querySelector<HTMLButtonElement>('.okButtons');
    if (!target) return;

    const progressInner = document.querySelector('#progress div') as HTMLDivElement;
    const progressText = document.querySelector('#progressText') as HTMLParagraphElement;

    // Cancel button
    if (target.innerHTML === 'Cancel') {
      controller.abort();
      isGenerating.current = false;
      target.innerHTML = 'Generate';
      target.style.removeProperty('background-color');
      progressInner.style.width = '0%';
      progressText.innerHTML = '0%';
      return;
    }

    controller = new AbortController();
    isGenerating.current = true;

    target.innerHTML = 'Cancel';
    target.style.backgroundColor = '#ff0000';

    const onUpdate = (percent: number) => {
      progressInner.style.width = `${percent * 100}%`;
      progressText.innerHTML = `${Math.floor(percent * 100)}%`;
      // on finish
      if (percent === 1) {
        isGenerating.current = false;
        progressInner.style.width = '0%';
        progressText.innerHTML = '0%';
        target.style.removeProperty('background-color');
        target.innerHTML = 'Generate';
      }
    };

    try {
      const viewBox = {
        x: ctx.zoom.current,
        y: ctx.zoom.current,
        width: ctx.viewBoxSize.current,
        height: ctx.viewBoxSize.current,
      };

      const curves = preparePointsForAnimation(ctx.points, viewBox);
      setIsOneCubicBezier(curves.length === 1);

      if (curves.length === 1) {
        values.current = [+curves[0][2].toFixed(3), +curves[0][3].toFixed(3), +curves[0][4].toFixed(3), +curves[0][5].toFixed(3)];
        onUpdate(1);
        generateCode();
        return;
      }

      const points = await convertEasingFunctionToPoints(curves, samples, onUpdate, controller.signal);
      values.current = Array.from(points).map(e => +e.toFixed(3));

      generateCode();
    } catch (error) {
      isGenerating.current = false;
      console.error(error);
    }
  };

  const copyHandle = () => {
    const string = isOneCubicBezier
      ? `${cssVarName}: cubic-bezier(${values.current.join(', ')});`
      : `${cssVarName}: linear(${values.current.join(', ')});`;
    navigator.clipboard.writeText(string);
  };

  useEffect(() => {
    if (!isGenerating.current) generateClick();
  }, []);

  useEffect(() => {
    generateCode();
  }, [cssVarName, isOneCubicBezier]);

  return (
    <div>
      <h3 className='download-dialog-title'>Export as CSS linear()</h3>

      {isOneCubicBezier && (
        <div className='warning'>
          The current path uses a single curve, which can be represented with the CSS <strong>cubic-bezier()</strong> function.
          Consider using multiple curves to generate the result as a <strong>linear()</strong> css function.
        </div>
      )}

      <div className='pre-container'>
        <pre className='download-dialog-pre custom-scrollbar' />
        <button type='button' className='css-dialog-copy-button' onClick={copyHandle}>
          Copy
        </button>
      </div>

      {!isOneCubicBezier && (
        <div className='inputsContainer' title='How many samples to generate, the more the better the result'>
          <p>Accuracy</p>
          <input
            type='number'
            placeholder='samples'
            value={samples}
            onChange={e => setSamples(+e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isGenerating.current) generateClick();
            }}
          />
        </div>
      )}

      <div className='inputsContainer' title='Custom CSS variable name'>
        <p>Name</p>
        <input placeholder='CustomEasing' value={cssVarName} onChange={e => setCssVarName(e.target.value)} spellCheck={false} />
      </div>

      <div id='progress'>
        <div />
      </div>

      <p id='progressText'>0%</p>

      <button type='button' className='okButtons' onClick={generateClick}>
        Generate
      </button>
    </div>
  );
}
