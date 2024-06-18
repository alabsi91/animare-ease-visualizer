import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { useEffect } from 'react';
import './ExportSvg.css';

import Dialog from '../components/Dialog/Dialog';
import { useApp } from '../utils/AppContext';

hljs.registerLanguage('javascript', javascript);

const fileName = 'test';
export default function ExportSvg() {
  const ctx = useApp();

  const highlight = () => {
    const pre = document.querySelector<HTMLPreElement>('.svg-dialog-pre');
    if (!pre) return;
    const string = ctx.getPathStringFromPoints();

    pre.innerHTML = string
      .replace(/(\s+)([a-z])/gi, '\n$2')
      .replace(/[a-z]/gi, '<span class="hljs-attribute">$&</span>')
      .replace(/\./g, '<span class="hljs-dot">$&</span>')
      .replace(/\d/g, '<span class="hljs-number">$&</span>');
  };

  useEffect(() => {
    highlight();
  }, []);

  useEffect(() => {
    const pre = document.querySelector<HTMLPreElement>('.svg-dialog-example-pre');
    if (!pre) return;
    const path = ctx.getPathStringFromPoints();

    const string = `// How to use ❔
import animare from 'animare';
import { ease } from 'animare/plugins';

animare.single({
  // ...options
  ease: ease.custom("${path}") // 👈
}, callback);
`;

    pre.innerHTML = hljs.highlight(string, { language: 'javascript' }).value;
  }, [fileName]);

  const copyHandle = () => {
    navigator.clipboard.writeText(ctx.getPathStringFromPoints());
  };

  return (
    <div id='svg-dialog'>
      <h2 className='svg-dialog-title'>Export as SVG Path</h2>

      <div className='pre-container'>
        <pre className='svg-dialog-example-pre custom-scrollbar' />
      </div>

      <div className='svg-dialog-pre-container'>
        <pre className='svg-dialog-pre custom-scrollbar' />
        <button className='svg-dialog-copy-button' onClick={copyHandle}>
          Copy
        </button>
      </div>

      <button className='svg-dialog-close-button' onClick={() => Dialog.$exportSvg?.toggle()}>
        Close
      </button>
    </div>
  );
}
