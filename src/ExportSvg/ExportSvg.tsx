import './ExportSvg.css';
import React, { useContext, useEffect } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import CTX from '../Helpers/CTX';

hljs.registerLanguage('javascript', javascript);

const fileName = 'test';
export default function ExportSvg() {
  const ctx = useContext(CTX);

  const highlight = () => {
    const pre = document.querySelector<HTMLPreElement>('.svg-dialog-pre');
    if (!pre) return;
    const string = ctx.parseResult();

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
    const path = ctx.parseResult()

    const string = `// How to use ❔

// animare
animare({
  // ...
  ease: ease.custom("${path}") // 👈
}, callback);

// GreenSock JS
gsap.registerPlugin(CustomEase);
gsap.to(element, {
  // ...
  ease: CustomEase.create("custom", "${path}") // 👈
});

// Mo.js
new mojs.Tween({
   // ...
  easing: mojs.easing.path("${path}") // 👈
});
`;

    pre.innerHTML = hljs.highlight(string, { language: 'javascript' }).value;
  }, [fileName]);

  const copyHandle = () => {
    navigator.clipboard.writeText(ctx.parseResult());
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

      <button className='svg-dialog-close-button' onClick={() => ctx.toggleExportDialog('SVG Path')}>
        Close
      </button>
    </div>
  );
}
