/* eslint-disable react-hooks/exhaustive-deps */
import './ExportSvg.css';
import React, { useContext, useEffect, useState } from 'react';
import CTX from '../Helpers/CTX';

export default function ExportSvg() {
  const ctx = useContext(CTX);

  const [update, setUpdate] = useState(0);

  const preElemtent = () => {
    const pre = document.querySelector<HTMLPreElement>('.svg-dialog-pre');
    if (!pre) return;
    const string = ctx.parseResult();

    pre.innerHTML = string
      .replace(/(\s+)([a-z])/gi, '\n$2')
      .replace(/[a-z]/gi, '<span class="letter">$&</span>')
      .replace(/\./g, '<strong class="dot">$&</strong>')
      .replace(/\d/g, '<strong class="number">$&</strong>');
  };

  useEffect(() => {
    preElemtent();
  }, [update]);

  useEffect(() => {
    const dialog = document.getElementById('svg-dialog')?.parentNode as HTMLDialogElement;
    const onShow = () => {
      setUpdate(Math.random());
    };

    dialog.addEventListener('animationstart', onShow);

    return () => {
      dialog.removeEventListener('animationstart', onShow);
    };
  }, []);

  const copyHandle = () => {
    navigator.clipboard.writeText(ctx.parseResult());
  };

  return (
    <div id='svg-dialog'>
      <h2 className='svg-dialog-title'>Export as SVG Path</h2>

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
